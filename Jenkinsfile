def runCommand(String command) {
    if (isUnix()) {
        sh command
    } else {
        bat command
    }
}

pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        CI = 'true'
        NODE_ENV = 'development'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                script {
                    runCommand('node --version')
                    runCommand('npm --version')
                    runCommand('npm ci --no-audit --no-fund')
                }
            }
        }

        stage('Quality Checks') {
            parallel {
                stage('Lint') {
                    steps {
                        script {
                            runCommand('npm run lint')
                        }
                    }
                }

                stage('API Tests') {
                    steps {
                        script {
                            runCommand('npm test')
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    runCommand('npm run build')
                }
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }
    }

    post {
        success {
            echo 'React application built and tested successfully.'
        }
        failure {
            echo 'Pipeline failed. Review the failed stage output above.'
        }
        always {
            deleteDir()
        }
    }
}
