const micromatch = require('micromatch');

module.exports = {
  '*.{js,jsx,ts,tsx,json}': (files) => {
    // from `files` filter those _NOT_ matching `*test.js`
    const match = micromatch.not(files, ['**/templates/**', '**/ba-storybook/**']);
    return [`eslint ${match.join(' ')}`, `git add ${files.join(' ')}`];
  },
};
