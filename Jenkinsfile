pipeline {
        agent {
        label 'ecs'
        }
    stages {
        stage('Setup') {
            steps {
                sh './scripts/download-node-modules.sh'
                sh 'yarn --frozen-lockfile'
            }
        }
        /*
        stage('Test') {
            steps {
                sh "BA_ENV=${params.stage} yarn workspace @buyerassist/$JOB_BASE_NAME lint"
                sh "BA_ENV=${params.stage} yarn workspace @buyerassist/$JOB_BASE_NAME test"
            }
        }
        */
        stage('Build') {
            steps {
                sh "BA_ENV=${params.stage} yarn workspace @buyerassist/$JOB_BASE_NAME build"
            }
        }
        stage('Deploy') {
            steps {
                sh "BA_ENV=${params.stage} yarn workspace @buyerassist/$JOB_BASE_NAME deploy"
            }
        }
        stage('PostDeploy') {
            steps {
                sh './scripts/upload-node-modules.sh'
            }
        }
    }
}
