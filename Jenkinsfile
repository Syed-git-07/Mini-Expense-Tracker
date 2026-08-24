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
        PORT = '4000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'call npm ci --no-audit --no-fund'
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

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Start Application') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $pidFile = Join-Path $env:WORKSPACE 'expense-tracker.pid'
                    $stdoutLog = Join-Path $env:WORKSPACE 'expense-tracker.out.log'
                    $stderrLog = Join-Path $env:WORKSPACE 'expense-tracker.err.log'

                    if (Test-Path -LiteralPath $pidFile) {
                        $previousPid = [int](Get-Content -Raw -LiteralPath $pidFile)
                        $previousProcess = Get-Process -Id $previousPid -ErrorAction SilentlyContinue

                        if ($previousProcess) {
                            & taskkill.exe /PID $previousPid /T /F | Out-Null
                        }

                        Remove-Item -LiteralPath $pidFile -Force
                    }

                    $listeners = Get-NetTCPConnection `
                        -LocalPort $env:PORT `
                        -State Listen `
                        -ErrorAction SilentlyContinue

                    foreach ($listener in $listeners) {
                        $owner = Get-CimInstance `
                            -ClassName Win32_Process `
                            -Filter "ProcessId = $($listener.OwningProcess)"

                        if ($owner.Name -eq 'node.exe' -and $owner.CommandLine -match 'server\.js') {
                            Stop-Process -Id $owner.ProcessId -Force
                        } else {
                            throw "Port $env:PORT is occupied by PID $($listener.OwningProcess)."
                        }
                    }

                    $env:JENKINS_NODE_COOKIE = 'dontKillMe'
                    $env:NODE_ENV = 'production'
                    $application = Start-Process `
                        -FilePath 'node.exe' `
                        -ArgumentList 'server.js' `
                        -WorkingDirectory $env:WORKSPACE `
                        -RedirectStandardOutput $stdoutLog `
                        -RedirectStandardError $stderrLog `
                        -WindowStyle Hidden `
                        -PassThru

                    Set-Content -LiteralPath $pidFile -Value $application.Id

                    $healthy = $false
                    for ($attempt = 1; $attempt -le 15; $attempt++) {
                        Start-Sleep -Seconds 2
                        $application.Refresh()

                        if ($application.HasExited) {
                            if (Test-Path -LiteralPath $stderrLog) {
                                Get-Content -LiteralPath $stderrLog
                            }
                            throw "Application exited before becoming healthy. Exit code: $($application.ExitCode)"
                        }

                        try {
                            $response = Invoke-RestMethod `
                                -Uri 'http://localhost:4000/api/health' `
                                -TimeoutSec 5

                            if ($response.status -eq 'ok') {
                                $healthy = $true
                                break
                            }
                        } catch {
                            Write-Host "Health check attempt $attempt failed."
                        }
                    }

                    if (-not $healthy) {
                        & taskkill.exe /PID $application.Id /T /F | Out-Null
                        throw 'Application did not become healthy on port 4000.'
                    }

                    Write-Host 'Application is available at http://localhost:4000'
                '''
            }
        }
    }

    post {
        success {
            echo 'Expense Tracker pipeline executed successfully!'
            echo 'Website and API: http://localhost:4000'
        }

        failure {
            echo 'Pipeline failed. Review the failed stage and application logs.'
        }
    }
}
