pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'call npm ci || call npm install'
            }
        }

        stage('Quality Checks') {
            parallel {

                stage('Lint') {
                    steps {
                        bat 'call npm run lint'
                    }
                }

                stage('API Tests') {
                    steps {
                        bat 'call npm test'
                    }
                }
            }
        }

        stage('Build Application') {
            steps {
                bat 'call npm run build'
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

        stage('Start Backend') {
            steps {
                bat '''
                    set JENKINS_NODE_COOKIE=dontKillMe
                    start "" cmd /c "npm start"
                '''
            }
        }

        stage('Run Frontend') {
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
            echo 'Frontend: http://localhost:8081'
        }

        failure {
            echo 'Pipeline failed!'
        }
    }
}