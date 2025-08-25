ARG REGISTRY_URL DOCKER_REPO_NAME

# Base image from 
FROM node:18

# Install JFrog CLI
RUN curl -fL https://getcli.jfrog.io | sh && mv jfrog /usr/local/bin/jf

# Create app directory
WORKDIR /usr/src/app/

# Copy dependency definitions
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY .jfrog ./.jfrog

# Install dependencies using JFrog CLI
#RUN --mount=type=secret,id=jfrog_access_token \
#    export JFROG_ACCESS_TOKEN=$(cat /run/secrets/jfrog_access_token) && \
#    jf config add psazuse --url https://psazuse.jfrog.io --access-token $JFROG_ACCESS_TOKEN && \
#    jf npm ci --ignore-scripts

# Get all the code needed to run the app
COPY . .

# Expose the port the app runs in
EXPOSE 4000

# Serve the app
CMD ["npm", "start"]
