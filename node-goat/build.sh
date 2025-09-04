#!/bin/bash

# Define build name and number for traceability in Artifactory
export JFROG_BUILD_NAME="nodegoat-app"
export JFROG_BUILD_NUMBER=$(date +%s)

echo "Building and publishing build info for NodeGoat..."

# Clean the npm cache to ensure a fresh download.
# npm cache clean --force

# Remove the node_modules directory and package-lock.json just for the lab situation as we pre populated this without the cache to improve performance.
cd ~/jfrog/node-goat
# rm -rf node_modules
rm -f package-lock.json

# Use JFrog CLI to install npm dependencies and capture build info
# The --build-name and --build-number flags associate this action with a build
jf npm install --build-name=$JFROG_BUILD_NAME --build-number=$JFROG_BUILD_NUMBER --no-fund --no-audit --omit=dev --prefer-offline
#jf npm ci --no-fund --no-audit (This is what we should be running ina real CI job)

# You can optionally publish the package itself, but for a build scan, the dependencies are what's key
jf npm publish --build-name=$JFROG_BUILD_NAME --build-number=$JFROG_BUILD_NUMBER

jf rt bce $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER
jf rt bag $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER

# Publish the collected build information to Artifactory
echo "Publishing build info..."
jf rt bp $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER

HFQDN=`nslookup academy-artifactory |grep academy-artifactory |awk '{print $1}'|grep -v Name`
jf docker login  -uadmin -pAdmin1234! ${HFQDN}

# Trigger the Xray scan on the published build info
echo "Running Xray scan on build $JFROG_BUILD_NAME/$JFROG_BUILD_NUMBER..."
jf bs $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER

# Build the docker image
docker build -t nodegoat:1.0 .

jf docker scan nodegoat:1.0
 
echo "Build process completed successfully!"
