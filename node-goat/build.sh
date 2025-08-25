#!/bin/bash

# Define build name and number for traceability in Artifactory
export JFROG_BUILD_NAME="nodegoat-app"
export JFROG_BUILD_NUMBER=$(date +%s)

echo "Building and publishing build info for NodeGoat..."

# Use JFrog CLI to install npm dependencies and capture build info
# The --build-name and --build-number flags associate this action with a build
jf npm install --build-name=$JFROG_BUILD_NAME --build-number=$JFROG_BUILD_NUMBER
#jf npm ci --no-fund --no-audit

# You can optionally publish the package itself, but for a build scan, the dependencies are what's key
# jf rt npm publish --build-name=$JFROG_BUILD_NAME --build-number=$JFROG_BUILD_NUMBER

jf rt bce $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER
jf rt bag $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER

# Publish the collected build information to Artifactory
echo "Publishing build info..."
jf rt bp $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER

# Trigger the Xray scan on the published build info
echo "Running Xray scan on build $JFROG_BUILD_NAME/$JFROG_BUILD_NUMBER..."
jf bs $JFROG_BUILD_NAME $JFROG_BUILD_NUMBER

echo "Build process completed successfully!"
