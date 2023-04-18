const arg = require('arg');
const fs = require('fs');
const YAML = require('yaml');
const AWS = require('aws-sdk');
const { exit } = require('process');

const args = arg({
  '--help': Boolean,
  '--env': String,
  '-e': '--env',
  '--rtag': String,
});
if (args['--help']) {
  console.log('\nnode .js --env <env> --rtag <rtag>');
  exit();
}
if (!args['--env']) {
  console.log('Missing required argument: --env');
  console.log('\nnode .js --env <env> --rtag <rtag>');
  exit();
}

if (!args['--rtag']) {
  console.log('Using "latest" as the default release tag');
}

const rtag = args['--rtag'] || 'latest';
const env = args['--env'];
const INPUT_SERVERLESS_FILE = `./serverless.yml`;
const OUTPUT_SERVERLESS_FILE = `./serverless.yml`;

removeCloudformationTags = (data) => {
  return data
    .replace(/!Ref /g, 'xx!Refxx')
    .replace(/!Sub /g, 'xx!Subxx')
    .replace(/!GetAtt /g, 'xx!GetAttxx');
};

addCloudformationTags = (data) => {
  return data
    .replace(/xx!Refxx/g, '!Ref ')
    .replace(/xx!Subxx/g, '!Sub ')
    .replace(/xx!GetAttxx/g, '!GetAtt ')
    .replace(/2012-10-17/g, "'2012-10-17'");
};

parseServerlessYML = () => {
  const file = removeCloudformationTags(fs.readFileSync(INPUT_SERVERLESS_FILE, 'utf8'));
  const parsedYml = YAML.parse(file);
  return parsedYml;
};

getImageUrl = async (parsedYml) => {
  const SERVICE_NAME = parsedYml['service'];
  const REPOSITORY_NAME = `serverless-${SERVICE_NAME}-main`;
  const credentials = new AWS.Credentials(process.env.ECR_AWS_ACCESS_KEY_ID, process.env.ECR_AWS_SECRET_ACCESS_KEY);
  const ecr = new AWS.ECR({ region: 'us-east-2', credentials });
  let imageUrl = '';
  let repoUri = '';
  let imageSha = '';
  // **** Get repository related information
  const repositoryParams = {
    repositoryNames: [REPOSITORY_NAME],
  };
  try {
    const repoInfo = await ecr.describeRepositories(repositoryParams).promise();
    repoUri = repoInfo['repositories'][0]['repositoryUri'];
  } catch (e) {
    console.log('ERROR while getting Repositories', e);
    process.exit(1);
  }
  // *****

  // **** GET Image Sha with latest tag
  const imageParams = {
    imageIds: [
      {
        imageTag: rtag,
      },
    ],
    repositoryName: REPOSITORY_NAME,
  };
  try {
    const imageInfo = await ecr.batchGetImage(imageParams).promise();
    imageSha = imageInfo.images[0].imageId.imageDigest;
  } catch (e) {
    console.log('ERROR while getting Images', e);
    process.exit(1);
  }
  imageUrl = `${repoUri}@${imageSha}`;
  console.log('ImageUrl', imageUrl);
  return imageUrl;
};
updateServerlessYml = async (env, parsedYml) => {
  let imageUrl = '';
  if (['prod','ci','uat'].indexOf(env) != -1) {
    imageUrl = await getImageUrl(parsedYml);
  }
  const functionMap = parsedYml['functions'];
  for (functionName of Object.keys(functionMap)) {
    const functionValue = functionMap[functionName];
    if (env === 'local') {
      break;
    } else if (env === 'qa' || env === 'main') {
      const handler = functionValue['handler'];
      if(!handler){
        break;
      }
      functionValue['image'] = { name: 'latest', command: [handler] };
      delete functionValue['handler'];
    } else {
      if (imageUrl == '') {
        process.exit(1);
      }
      console.log(imageUrl);
      const handler = functionValue['handler'];
      if(!handler){
        break;
      }
      functionValue['image'] = { uri: imageUrl, command: [handler] };
      delete functionValue['handler'];
    }
  }
  return parsedYml;
};

writeUpdatedServerlessYml = (updatedYml) => {
  fs.writeFileSync(OUTPUT_SERVERLESS_FILE, addCloudformationTags(YAML.stringify(updatedYml)));
};

main = async () => {
  const parsedYml = parseServerlessYML();
  if (parsedYml.service.indexOf('-v2') > -1) {
    const updatedYml = await updateServerlessYml(env, parsedYml);
    writeUpdatedServerlessYml(updatedYml);
  }
  return;
};

main();
