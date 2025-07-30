#!/bin/bash

# Configuration Variables
# Replace with your Artifactory details
HFQDN=`nslookup academy-sup-artifactory |grep academy-sup-artifactory |awk '{print $1}'|grep -v Name`
# JFROG_PLATFORM_URL="http://${HFQDN}"
JFROG_PLATFORM_URL="https://acrois.jfrog.io"
ARTIFACTORY_DOCKER_REPO="fed01-docker-local" 
IMAGE_NAME="my-app-with-secrets-alpine"
IMAGE_TAG="1.0.0"
BUILD_NAME="my-secret-app-build"
BUILD_NUMBER="$(date +%Y%m%d%H%M%S)" # Unique build number based on timestamp

# --- Step 1: Login to JFrog Platform (if not already logged in) ---
echo "--- Logging into JFrog Platform ---"
# It's recommended to configure JFrog CLI with 'jf c add' beforehand
# or use environment variables for credentials (JF_USER, JF_PASSWORD/JF_ACCESS_TOKEN)
jf rt ping --url="$JFROG_PLATFORM_URL" || { echo "JFrog CLI not configured or cannot reach platform. Please run 'jf c add' or set environment variables."; exit 1; }
echo "Successfully connected to JFrog Platform."

# --- Step 2: Build the Docker Image ---
echo "--- Building Docker Image: ${IMAGE_NAME}:${IMAGE_TAG} ---"
jf docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
if [ $? -ne 0 ]; then
    echo "Docker image build failed!"
    exit 1
fi
echo "Docker image built successfully."

# --- Step 3: Tag the Docker Image for Artifactory ---
# The format is <Artifactory_URL>/<docker_repo_name>/<image_name>:<tag>
ARTIFACTORY_IMAGE_FULL_PATH="${JFROG_PLATFORM_URL#https://}/${ARTIFACTORY_DOCKER_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
echo "--- Tagging Docker Image for Artifactory: ${ARTIFACTORY_IMAGE_FULL_PATH} ---"
jf docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ARTIFACTORY_IMAGE_FULL_PATH}
if [ $? -ne 0 ]; then
    echo "Docker image tagging failed!"
    exit 1
fi
echo "Docker image tagged successfully."

# --- Step 4: Configure Docker client to push to Artifactory ---
# This is usually done once per host or session
echo "--- Configuring Docker client for Artifactory login ---"
# JFrog CLI can automatically configure docker login if you're logged into the CLI
# jf docker login ${ARTIFACTORY_IMAGE_FULL_PATH}
# if [ $? -ne 0 ]; then
#     echo "JFrog Docker login failed!"
#     exit 1
# fi
# echo "Docker client configured for Artifactory."

# --- Step 5: Push the Docker Image to Artifactory and capture build-info ---
echo "--- Pushing Docker Image to Artifactory and collecting build-info ---"
# The 'jf rt docker-push' command combines docker push with build-info collection
jf docker push ${ARTIFACTORY_IMAGE_FULL_PATH} ${ARTIFACTORY_DOCKER_REPO} \
    --build-name="${BUILD_NAME}" \
    --build-number="${BUILD_NUMBER}"

if [ $? -ne 0 ]; then
    echo "Docker image push to Artifactory failed!"
    exit 1
fi
echo "Docker image pushed to Artifactory and build-info collected successfully."

# --- Step 6: Publish Build Info to Artifactory ---
echo "--- Publishing Build Info to Artifactory for Xray scanning ---"
jf rt build-publish "${BUILD_NAME}" "${BUILD_NUMBER}"
if [ $? -ne 0 ]; then
    echo "Publishing build info failed!"
    exit 1
fi
echo "Build info published successfully. Xray scan will now commence."

echo "--- Script finished successfully ---"
echo "Image: ${ARTIFACTO_IMAGE_FULL_PATH}"
echo "Build Name: ${BUILD_NAME}"
echo "Build Number: ${BUILD_NUMBER}"
echo "You can view this build and its Xray scan results in the JFrog Platform UI."

# Optional: Clean up local image tags
# docker rmi ${IMAGE_NAME}:${IMAGE_TAG} ${ARTIFACTORY_IMAGE_FULL_PATH} --force