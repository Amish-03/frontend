pipeline {
    agent any

    parameters {
        string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS Region')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '888577028066', description: 'AWS Account ID for Amazon ECR')
        string(name: 'ECR_REPO_NAME', defaultValue: 'amish', description: 'ECR Repository Name')
        string(name: 'IMAGE_TAG', defaultValue: 'frontend', description: 'Docker Image Tag')
        string(name: 'TARGET_GROUP_NAME', defaultValue: 'TargetGroup-1', description: 'AWS ELB Target Group Name to discover instances from')
        string(name: 'FALLBACK_EC2_HOSTS', defaultValue: 'ec2-35-171-225-161.compute-1.amazonaws.com,ec2-100-48-207-3.compute-1.amazonaws.com', description: 'Comma-separated fallback EC2 hostnames if auto-discovery cannot be queried')
        string(name: 'EC2_USER', defaultValue: 'ubuntu', description: 'EC2 SSH Username')
        string(name: 'PEM_DIR', defaultValue: 'C:\\Users\\Administrator\\Desktop\\ec2', description: 'Local directory on agent containing the PEM key')
        string(name: 'PEM_FILE', defaultValue: 'testubuntu.pem', description: 'SSH Private Key filename')
        string(name: 'CONTAINER_NAME', defaultValue: 'frontend', description: 'Target container name on EC2')
        string(name: 'COMPOSE_SERVICE', defaultValue: 'frontend', description: 'Service name in docker-compose.yml on EC2')
    }

    environment {
        AWS_REGION                  = "${params.AWS_REGION}"
        AWS_ACCOUNT_ID              = "${params.AWS_ACCOUNT_ID}"
        ECR_REPO_NAME               = "${params.ECR_REPO_NAME}"
        IMAGE_TAG                   = "${params.IMAGE_TAG}"
        ECR_REGISTRY                = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        FULL_IMAGE_NAME             = "${ECR_REGISTRY}/${ECR_REPO_NAME}:${IMAGE_TAG}"
        TARGET_GROUP_NAME           = "${params.TARGET_GROUP_NAME}"
        FALLBACK_EC2_HOSTS          = "${params.FALLBACK_EC2_HOSTS}"
        EC2_USER                    = "${params.EC2_USER}"
        PEM_DIR                     = "${params.PEM_DIR}"
        PEM_FILE                    = "${params.PEM_FILE}"
        CONTAINER_NAME              = "${params.CONTAINER_NAME}"
        COMPOSE_SERVICE             = "${params.COMPOSE_SERVICE}"
        AWS_SHARED_CREDENTIALS_FILE = 'C:\\Users\\Administrator\\.aws\\credentials'
        AWS_CONFIG_FILE             = 'C:\\Users\\Administrator\\.aws\\config'
        USERPROFILE                 = 'C:\\Users\\Administrator'
        HOME                        = 'C:\\Users\\Administrator'
    }

    stages {
        // =====================================================================
        // Stage 1: Build the webpack / frontend assets
        // =====================================================================
        stage('Build the webpack') {
            steps {
                echo '=== Stage 1: Installing dependencies and building production assets ==='
                bat '''
                    call npm install
                    call npm run build
                '''
            }
        }

        // =====================================================================
        // Stage 2: Build docker image
        // =====================================================================
        stage('Build docker image') {
            steps {
                echo "=== Stage 2: Building Docker image: ${FULL_IMAGE_NAME} ==="
                bat """
                    docker build -t ${FULL_IMAGE_NAME} -t ${ECR_REPO_NAME}:${IMAGE_TAG} .
                """
            }
        }

        // =====================================================================
        // Stage 3: Push the docker image to the ECR
        // =====================================================================
        stage('Push the docker image to the ECR') {
            steps {
                echo "=== Stage 3: Authenticating with ECR and pushing ${FULL_IMAGE_NAME} ==="
                bat """
                    @echo off
                    echo Switching directory to ${PEM_DIR}...
                    cd /d "${PEM_DIR}"
                    set "AWS_SHARED_CREDENTIALS_FILE=C:\\Users\\Administrator\\.aws\\credentials"
                    set "AWS_CONFIG_FILE=C:\\Users\\Administrator\\.aws\\config"
                    set "USERPROFILE=C:\\Users\\Administrator"
                    set "HOME=C:\\Users\\Administrator"
                    echo Logging into Amazon ECR...
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    echo Pushing ${FULL_IMAGE_NAME} to ECR...
                    docker push ${FULL_IMAGE_NAME}
                """
            }
        }

        // =====================================================================
        // Stage 4: Pull image from ECR to all Target Group instances and run
        // =====================================================================
        stage('Pull the image from ECR to the EC2 instance and run') {
            steps {
                echo "=== Stage 4: Deploying to all instances in Target Group: ${TARGET_GROUP_NAME} ==="
                script {
                    // Create remote deployment script dynamically
                    writeFile file: 'deploy_remote.sh', text: """#!/bin/bash
set -e

echo "=== [EC2 \$(hostname)] Logging in to Amazon ECR ==="
aws ecr get-login-password --region ${AWS_REGION} | sudo docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "=== [EC2 \$(hostname)] Pulling latest image: ${FULL_IMAGE_NAME} ==="
sudo docker pull ${FULL_IMAGE_NAME}

echo "=== [EC2 \$(hostname)] Stopping running container if active ==="
if [ \$(sudo docker ps -q -f name=${CONTAINER_NAME}) ]; then
    echo "Stopping container ${CONTAINER_NAME}..."
    sudo docker stop ${CONTAINER_NAME}
fi

if [ \$(sudo docker ps -aq -f name=${CONTAINER_NAME}) ]; then
    echo "Removing container ${CONTAINER_NAME}..."
    sudo docker rm ${CONTAINER_NAME}
fi

echo "=== [EC2 \$(hostname)] Deleting old image ==="
sudo docker rmi -f ${FULL_IMAGE_NAME} 2>/dev/null || true

echo "=== [EC2 \$(hostname)] Taking latest image from ECR ==="
sudo docker pull ${FULL_IMAGE_NAME}

echo "=== [EC2 \$(hostname)] Running docker compose for ${COMPOSE_SERVICE} service only ==="
cd /home/ubuntu
if command -v docker-compose >/dev/null 2>&1; then
    sudo docker-compose up -d --no-deps ${COMPOSE_SERVICE}
elif sudo docker compose version >/dev/null 2>&1; then
    sudo docker compose up -d --no-deps ${COMPOSE_SERVICE}
else
    echo "docker-compose not found, running directly via sudo docker run..."
    sudo docker run -d --name ${CONTAINER_NAME} -p 80:80 --restart unless-stopped ${FULL_IMAGE_NAME}
fi

echo "=== [EC2 \$(hostname)] Deployment status ==="
sudo docker ps --filter name=${CONTAINER_NAME}
"""

                    // Create Target Group discovery and deployment script for Windows agent
                    writeFile file: 'deploy_all_instances.ps1', text: """
\$ErrorActionPreference = "Stop"
\$env:AWS_SHARED_CREDENTIALS_FILE = "C:\\Users\\Administrator\\.aws\\credentials"
\$env:AWS_CONFIG_FILE = "C:\\Users\\Administrator\\.aws\\config"
\$env:USERPROFILE = "C:\\Users\\Administrator"
\$env:HOME = "C:\\Users\\Administrator"

Write-Host "=========================================================="
Write-Host "Discovering target instances for Target Group: \$env:TARGET_GROUP_NAME"
Write-Host "=========================================================="

# 1. Enforce strict private key permissions for OpenSSH
\$pemPath = Join-Path \$env:PEM_DIR \$env:PEM_FILE
Write-Host "Enforcing strict NTFS permissions on: \$pemPath"
& icacls \$pemPath /inheritance:r | Out-Null
& icacls \$pemPath /remove "BUILTIN\\Administrators" 2>\$null | Out-Null
& icacls \$pemPath /remove "A676FB5C1672570\\Administrator" 2>\$null | Out-Null
& icacls \$pemPath /remove "Administrator" 2>\$null | Out-Null
& icacls \$pemPath /grant:r "\$(\$env:USERNAME):R" | Out-Null
& icacls \$pemPath /grant:r "SYSTEM:R" | Out-Null

# 2. Query Target Group instances from AWS ELB
\$targetHosts = [System.Collections.Generic.List[string]]::new()

Write-Host "Querying Target Group: \$env:TARGET_GROUP_NAME via AWS CLI..."
try {
    \$prevEAP = \$ErrorActionPreference
    \$ErrorActionPreference = "Continue"

    \$tgCmdOut = cmd.exe /c "aws elbv2 describe-target-groups --names \$env:TARGET_GROUP_NAME --region \$env:AWS_REGION --query `"TargetGroups[0].TargetGroupArn`" --output text 2>nul"
    \$tgArn = if (\$tgCmdOut) { "\$tgCmdOut".Trim() } else { "" }

    if (\$tgArn -and \$tgArn -ne "None" -and (-not \$tgArn.StartsWith("aws:"))) {
        Write-Host "Target Group ARN found: \$tgArn"
        \$instCmdOut = cmd.exe /c "aws elbv2 describe-target-health --target-group-arn \$tgArn --region \$env:AWS_REGION --query `"TargetHealthDescriptions[*].Target.Id`" --output text 2>nul"
        \$instanceIds = if (\$instCmdOut) { "\$instCmdOut".Trim() } else { "" }

        if (\$instanceIds -and (-not \$instanceIds.StartsWith("aws:"))) {
            \$idsList = \$instanceIds -split '\\s+' | Where-Object { \$_ -ne "" }
            Write-Host "Discovered \$(\$idsList.Count) instance ID(s) in Target Group: \$(\$idsList -join ', ')"

            foreach (\$instId in \$idsList) {
                \$dnsOut = cmd.exe /c "aws ec2 describe-instances --instance-ids \$instId --region \$env:AWS_REGION --query `"Reservations[0].Instances[0].PublicDnsName`" --output text 2>nul"
                \$dns = if (\$dnsOut) { "\$dnsOut".Trim() } else { "" }
                \$ipOut = cmd.exe /c "aws ec2 describe-instances --instance-ids \$instId --region \$env:AWS_REGION --query `"Reservations[0].Instances[0].PublicIpAddress`" --output text 2>nul"
                \$ip = if (\$ipOut) { "\$ipOut".Trim() } else { "" }

                \$selectedHost = if (\$dns -and \$dns -ne "None" -and (-not \$dns.StartsWith("aws:"))) { \$dns } elseif (\$ip -and \$ip -ne "None" -and (-not \$ip.StartsWith("aws:"))) { \$ip } else { \$null }

                if (\$selectedHost) {
                    Write-Host "  -> Instance \$instId resolved to: \$selectedHost"
                    if (-not \$targetHosts.Contains(\$selectedHost)) {
                        \$targetHosts.Add(\$selectedHost)
                    }
                } else {
                    Write-Warning "Could not resolve public DNS/IP for instance \$instId"
                }
            }
        }
    } else {
        Write-Warning "Target Group auto-discovery note: Unable to query Target Group '\$env:TARGET_GROUP_NAME' directly via AWS CLI (current IAM credentials lack elasticloadbalancing/ec2 Describe permissions)."
    }
    \$ErrorActionPreference = \$prevEAP
} catch {
    Write-Warning "Exception during Target Group discovery: \$_"
}

# 3. Fallback hosts if auto-discovery cannot be queried
if (\$targetHosts.Count -eq 0) {
    Write-Host "Auto-discovery returned 0 hosts. Using configured FALLBACK_EC2_HOSTS: \$env:FALLBACK_EC2_HOSTS"
    if (\$env:FALLBACK_EC2_HOSTS) {
        \$fallbackList = \$env:FALLBACK_EC2_HOSTS -split ',' | ForEach-Object { \$_.Trim() } | Where-Object { \$_ -ne "" }
        foreach (\$h in \$fallbackList) {
            if (-not \$targetHosts.Contains(\$h)) {
                \$targetHosts.Add(\$h)
            }
        }
    }
}

if (\$targetHosts.Count -eq 0) {
    Write-Error "No target instances found to deploy to!"
    exit 1
}

Write-Host "Total instances to deploy: \$(\$targetHosts.Count) (\$(\$targetHosts -join ', '))"

# 4. Deploy sequentially to each target instance
\$remoteScript = "\$env:WORKSPACE\\deploy_remote.sh"
Set-Location \$env:PEM_DIR

\$deployedReport = [System.Collections.Generic.List[string]]::new()
\$idx = 1
foreach (\$hostEntry in \$targetHosts) {
    Write-Host ""
    Write-Host "=========================================================="
    Write-Host "[\$idx/\$(\$targetHosts.Count)] Deploying to target: \$hostEntry"
    Write-Host "=========================================================="

    cmd.exe /c "ssh -i `"\$env:PEM_FILE`" -o StrictHostKeyChecking=no \$env:EC2_USER@\$hostEntry < `"\$remoteScript`""
    if (\$LASTEXITCODE -ne 0) {
        Write-Error "Deployment failed on \$hostEntry with exit code \$LASTEXITCODE"
        exit \$LASTEXITCODE
    }
    \$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[\$idx/\$(\$targetHosts.Count)] Successfully deployed to \$hostEntry!"
    \$deployedReport.Add("  * Instance #\$idx : \$hostEntry")
    \$deployedReport.Add("    - Status       : Image Pulled & Docker Compose Running")
    \$deployedReport.Add("    - Completed At : \$timestamp UTC")
    \$idx++
}

# Save summary to file for Jenkins email notification
\$summaryPath = "\$env:WORKSPACE\\deployment_summary.txt"
\$deployedReport | Out-File -FilePath \$summaryPath -Encoding utf8

Write-Host ""
Write-Host "=========================================================="
Write-Host "All \$(\$targetHosts.Count) instance(s) in \$env:TARGET_GROUP_NAME successfully updated!"
Write-Host "=========================================================="
"""
                }

                bat """
                    @echo off
                    if exist "%WORKSPACE%\\deployment_summary.txt" del /f /q "%WORKSPACE%\\deployment_summary.txt"
                    echo Running multi-instance deployment for Target Group %TARGET_GROUP_NAME%...
                    powershell -ExecutionPolicy Bypass -File "%WORKSPACE%\\deploy_all_instances.ps1"
                """
            }
        }
    }

    post {
        always {
            bat """
                @echo off
                if exist deploy_remote.sh del /f /q deploy_remote.sh
                if exist deploy_all_instances.ps1 del /f /q deploy_all_instances.ps1
                cd /d "${PEM_DIR}"
                icacls "${PEM_FILE}" /grant:r "Administrator:(F)" 2>nul
            """
        }
        success {
            script {
                def deployedInstancesList = "No instance details captured."
                if (fileExists('deployment_summary.txt')) {
                    deployedInstancesList = readFile('deployment_summary.txt').trim()
                }

                mail(
                    to: 'amishkulkarni03@gmail.com',
                    subject: "SUCCESS: ${JOB_NAME} #${BUILD_NUMBER} [${TARGET_GROUP_NAME}]",
                    body: """======================================================================
                  PIPELINE DEPLOYMENT REPORT (SUCCESS)
======================================================================
Pipeline / Job:     ${JOB_NAME}
Build Number:       #${BUILD_NUMBER}
Build Status:       SUCCESS
Build URL:          ${BUILD_URL}

----------------------------------------------------------------------
AWS & TARGET GROUP CONFIGURATION:
----------------------------------------------------------------------
Target Group:       ${TARGET_GROUP_NAME}
AWS Region:         ${AWS_REGION}
AWS Account ID:     ${AWS_ACCOUNT_ID}
ECR Repository:     ${ECR_REPO_NAME}
Docker Image:       ${FULL_IMAGE_NAME}
Compose Service:    ${COMPOSE_SERVICE}
Container Name:     ${CONTAINER_NAME}

----------------------------------------------------------------------
EC2 INSTANCES THAT PULLED THE LATEST IMAGE:
----------------------------------------------------------------------
${deployedInstancesList}

----------------------------------------------------------------------
PIPELINE STAGE AUDIT:
----------------------------------------------------------------------
[PASSED] Stage 1: Build the webpack (npm install & npm run build)
[PASSED] Stage 2: Build docker image (${FULL_IMAGE_NAME})
[PASSED] Stage 3: Push docker image to Amazon ECR
[PASSED] Stage 4: Pull image from ECR to all TargetGroup instances & run
======================================================================
"""
                )
            }
        }

        failure {
            mail(
                to: 'amishkulkarni03@gmail.com',
                subject: "FAILED: ${JOB_NAME} #${BUILD_NUMBER} [${TARGET_GROUP_NAME}]",
                body: """======================================================================
                  PIPELINE EXECUTION FAILED
======================================================================
Project:       ${JOB_NAME}
Build Number:  #${BUILD_NUMBER}
Build Status:  FAILURE
Build URL:     ${BUILD_URL}
Target Group:  ${TARGET_GROUP_NAME}
Docker Image:  ${FULL_IMAGE_NAME}

Please check the build console logs at the URL above to inspect the error.
======================================================================
"""
            )
        }
     }
}
