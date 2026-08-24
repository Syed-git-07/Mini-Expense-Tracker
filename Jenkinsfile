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

        stage('Install Dependencies') {
            steps {
                script {
                    runCommand('node --version')
                    runCommand('npm --version')
                    runCommand('call npm ci || call npm install')
                }
            }
        }

        stage('Quality Checks') {
            parallel {

                stage('Lint') {
                    steps {
                        script {
                            runCommand('call npm run lint')
                        }
                    }
                }

                stage('API Tests') {
                    steps {
                        script {
                            runCommand('call npm test')
                        }
                    }
                }
            }
        }

        stage('Build Application') {
            steps {
                script {
                    runCommand('call npm run build')
                }
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Deploy') {
            steps {
                bat '''
                    if not exist "C:\\ProgramData\\Jenkins\\.jenkins\\userContent\\expense-tracker" (
                        mkdir "C:\\ProgramData\\Jenkins\\.jenkins\\userContent\\expense-tracker"
                    )

                    xcopy /E /I /Y "dist\\*" "C:\\ProgramData\\Jenkins\\.jenkins\\userContent\\expense-tracker\\"
                '''
            }
        }

        stage('Run Website') {
            steps {
                bat '''
                    set JENKINS_NODE_COOKIE=dontKillMe
                    start "" cmd /c "npx serve -s dist -l 8081"
                '''
            }
        }
    }

    post {
        success {
            echo 'Expense Tracker pipeline executed successfully!'
            echo 'Website URL: http://localhost:8081'
        }

        failure {
            echo 'Pipeline failed! Review the failed stage output above.'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}