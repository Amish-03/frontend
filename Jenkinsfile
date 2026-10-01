pipeline {
    agent any

    parameters {
        string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS Region')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '888577028066', description: 'AWS Account ID for Amazon ECR')
        string(name: 'ECR_REPO_NAME', defaultValue: 'amish', description: 'ECR Repository Name')
        string(name: 'IMAGE_TAG', defaultValue: 'frontend', description: 'Docker Image Tag')
        string(name: 'AWS_CREDENTIALS_HOME', defaultValue: 'C:\\Users\\Administrator', description: 'Home directory containing the .aws CLI profile for the Jenkins agent fallback')
        string(name: 'EC2_HOST', defaultValue: 'ec2-35-171-225-161.compute-1.amazonaws.com', description: 'EC2 Public DNS or IP')
        string(name: 'EC2_USER', defaultValue: 'ubuntu', description: 'EC2 SSH Username')
        string(name: 'PEM_DIR', defaultValue: 'C:\\Users\\Administrator\\Desktop\\ec2', description: 'Local directory on agent containing the PEM key')
        string(name: 'PEM_FILE', defaultValue: 'testubuntu.pem', description: 'SSH Private Key filename')
        string(name: 'CONTAINER_NAME', defaultValue: 'frontend', description: 'Target container name on EC2')
        string(name: 'COMPOSE_SERVICE', defaultValue: 'frontend', description: 'Service name in docker-compose.yml on EC2')
    }

    environment {
        AWS_REGION      = "${params.AWS_REGION}"
        AWS_ACCOUNT_ID  = "${params.AWS_ACCOUNT_ID}"
        ECR_REPO_NAME   = "${params.ECR_REPO_NAME}"
        IMAGE_TAG       = "${params.IMAGE_TAG}"
        AWS_CREDENTIALS_HOME = "${params.AWS_CREDENTIALS_HOME}"
        ECR_REGISTRY    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        FULL_IMAGE_NAME = "${ECR_REGISTRY}/${ECR_REPO_NAME}:${IMAGE_TAG}"
        EC2_HOST        = "${params.EC2_HOST}"
        EC2_USER        = "${params.EC2_USER}"
        PEM_DIR         = "${params.PEM_DIR}"
        PEM_FILE        = "${params.PEM_FILE}"
        CONTAINER_NAME              = "${params.CONTAINER_NAME}"
        COMPOSE_SERVICE             = "${params.COMPOSE_SERVICE}"
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
        // Stage 3: Validate AWS credentials on the Jenkins agent
        // =====================================================================
        stage('Validate AWS credentials') {
            steps {
                echo '=== Stage 3: Validating AWS credentials on the Jenkins agent ==='
                bat '''
                    @echo off
                    set "AWS_SHARED_CREDENTIALS_FILE=%AWS_CREDENTIALS_HOME%\\.aws\\credentials"
                    set "AWS_CONFIG_FILE=%AWS_CREDENTIALS_HOME%\\.aws\\config"

                    if "%AWS_ACCESS_KEY_ID%"=="" (
                        if exist "%AWS_SHARED_CREDENTIALS_FILE%" (
                            echo AWS_ACCESS_KEY_ID not set. Falling back to AWS CLI profile at %AWS_SHARED_CREDENTIALS_FILE%.
                            set "USERPROFILE=%AWS_CREDENTIALS_HOME%"
                            set "HOME=%AWS_CREDENTIALS_HOME%"
                        ) else (
                            echo ERROR: AWS_ACCESS_KEY_ID is not set and no AWS CLI credentials file was found at %AWS_SHARED_CREDENTIALS_FILE%.
                            exit /b 1
                        )
                    )
                    if not "%AWS_ACCESS_KEY_ID%"=="" if "%AWS_SECRET_ACCESS_KEY%"=="" (
                        echo ERROR: AWS_SECRET_ACCESS_KEY is not set.
                        exit /b 1
                    )
                    if not "%AWS_SESSION_TOKEN%"=="" (
                        echo AWS_SESSION_TOKEN detected. Using temporary STS credentials.
                    ) else if not "%AWS_ACCESS_KEY_ID%"=="" (
                        echo AWS_SESSION_TOKEN not set. Assuming long-lived IAM user credentials.
                    ) else (
                        echo AWS_SESSION_TOKEN will be resolved from the AWS CLI profile if required.
                    )
                    aws sts get-caller-identity --region %AWS_REGION%
                '''
            }
        }

        // =====================================================================
        // Stage 3: Push the docker image to the ECR
        // =====================================================================
        stage('Push the docker image to the ECR') {
            steps {
                echo "=== Stage 4: Authenticating with ECR and pushing ${FULL_IMAGE_NAME} ==="
                bat """
                    @echo off
                    if "%AWS_ACCESS_KEY_ID%"=="" (
                        set "USERPROFILE=${AWS_CREDENTIALS_HOME}"
                        set "HOME=${AWS_CREDENTIALS_HOME}"
                        set "AWS_SHARED_CREDENTIALS_FILE=${AWS_CREDENTIALS_HOME}\\.aws\\credentials"
                        set "AWS_CONFIG_FILE=${AWS_CREDENTIALS_HOME}\\.aws\\config"
                    )
                    echo Logging into Amazon ECR...
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    echo Pushing ${FULL_IMAGE_NAME} to ECR...
                    docker push ${FULL_IMAGE_NAME}
                """
            }
        }

        // =====================================================================
        // Stage 4: Pull image from ECR to EC2 and run for this image only
        // =====================================================================
        stage('Pull the image from ECR to the EC2 instance and run') {
            steps {
                echo "=== Stage 5: Deploying to EC2 (${EC2_HOST}) ==="
                script {
                    // Create remote deployment script dynamically
                    writeFile file: 'deploy_remote.sh', text: """#!/bin/bash
set -e

echo "=== [EC2] Logging in to Amazon ECR ==="
aws ecr get-login-password --region ${AWS_REGION} | sudo docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "=== [EC2] Pulling latest image: ${FULL_IMAGE_NAME} ==="
sudo docker pull ${FULL_IMAGE_NAME}

echo "=== [EC2] Stopping running container if active ==="
if [ \$(sudo docker ps -q -f name=${CONTAINER_NAME}) ]; then
    echo "Stopping container ${CONTAINER_NAME}..."
    sudo docker stop ${CONTAINER_NAME}
fi

if [ \$(sudo docker ps -aq -f name=${CONTAINER_NAME}) ]; then
    echo "Removing container ${CONTAINER_NAME}..."
    sudo docker rm ${CONTAINER_NAME}
fi

echo "=== [EC2] Deleting old image ==="
sudo docker rmi -f ${FULL_IMAGE_NAME} 2>/dev/null || true

echo "=== [EC2] Taking latest image from ECR ==="
sudo docker pull ${FULL_IMAGE_NAME}

echo "=== [EC2] Running docker compose for ${COMPOSE_SERVICE} service only ==="
cd /home/ubuntu
if command -v docker-compose >/dev/null 2>&1; then
    sudo docker-compose up -d --no-deps ${COMPOSE_SERVICE}
elif sudo docker compose version >/dev/null 2>&1; then
    sudo docker compose up -d --no-deps ${COMPOSE_SERVICE}
else
    echo "docker-compose not found, running directly via sudo docker run..."
    sudo docker run -d --name ${CONTAINER_NAME} -p 80:80 --restart unless-stopped ${FULL_IMAGE_NAME}
fi

echo "=== [EC2] Deployment status ==="
sudo docker ps --filter name=${CONTAINER_NAME}
"""
                }

                bat """
                    @echo off
                    echo Changing directory to ${PEM_DIR}...
                    cd /d "${PEM_DIR}"

                    echo Enforcing strict private key permissions for OpenSSH...
                    icacls "${PEM_FILE}" /inheritance:r
                    icacls "${PEM_FILE}" /remove "BUILTIN\\Administrators" 2>nul
                    icacls "${PEM_FILE}" /remove "A676FB5C1672570\\Administrator" 2>nul
                    icacls "${PEM_FILE}" /remove "Administrator" 2>nul
                    icacls "${PEM_FILE}" /grant:r "%USERNAME%:R"
                    icacls "${PEM_FILE}" /grant:r "SYSTEM:R"
                    icacls "${PEM_FILE}"

                    echo Connecting to ${EC2_USER}@${EC2_HOST} using ${PEM_FILE}...
                    ssh -i "${PEM_FILE}" -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} < "%WORKSPACE%\\deploy_remote.sh"
                """
            }
        }
    }

    post {
        always {
            bat """
                @echo off
                if exist deploy_remote.sh del /f /q deploy_remote.sh
                cd /d "${PEM_DIR}"
                icacls "${PEM_FILE}" /grant:r "Administrator:(F)" 2>nul
            """
        }
        success {
            mail(
                to: 'amishkulkarni03@gmail.com',
                subject: "SUCCESS: ${JOB_NAME} #${BUILD_NUMBER}",
                body: """
Build Successful

Project: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Status: SUCCESS
Build URL: ${BUILD_URL}
"""
            )
        }

        failure {
            mail(
                to: 'amishkulkarni03@gmail.com',
                subject: "FAILED: ${JOB_NAME} #${BUILD_NUMBER}",
                body: """
Build Failed

Project: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Status: FAILURE
Build URL: ${BUILD_URL}
"""
            )
        }
     }
}
