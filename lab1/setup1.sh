#!/bin/bash

exec 2>&1
exec > /tmp/lab-setup.out

source /root/.bashrc

log_error () {
    echo -e "[`date`]\033[31mERROR: $1\033[0m"
}

log_task () {
    echo -e "[`date`]\033[32mTASK: $1\033[0m"
}

log_task "Started Lab setup"


# Build docker image while we wait for Artifactory
cd jfrog/lab-2
docker build -t academy-docker-image . 
##

# Wait for Artifactory
while [ true ]
do
    wget http://academy-artifactory  > /dev/null 2>&1
    if [ $? -eq 0 ]
    then   
        break
    fi
done
log_task "Artifactory is responding"

while [ true ]
do
    jf config add  academy --url=http://academy-artifactory --user=admin --password=Admin1234! --interactive=false
    if [ $? -eq 0 ]
    then
        break
    fi
    sleep 20
done
log_task "JF Config executed"

echo '{"rclass": "local",
 "packageType": "docker",
 "key": "academy-docker-local",
 "repoLayoutRef": "simple-default",
 "xrayIndex": "true"
}' > /tmp/d.json
jf rt rc /tmp/d.json 
if [ $? -ne 0 ]
then
    log_error "Failed to create Docker Repo"
    exit 1
fi
log_task "Docker Repo created"

## Publish image to Artifactory
# put push in the background so we can continue with the script
HFQDN="academy-artifactory:80"
log_task "Docker login"
jf docker login  -uadmin -pAdmin1234! http://${HFQDN}
if [ $? -ne 0 ]
then
    log_error "Failed to login to Artifactory"
    exit 1
fi
log_task "Docker image tag"
jf docker tag academy-docker-image ${HFQDN}/academy-docker-local/academy-docker-image
if [ $? -ne 0 ]
then
    log_error "Failed to tag Docker image"
    exit 1
fi
log_task "Docker image tagged"

log_task "Docker push"
jf docker push ${HFQDN}/academy-docker-local/academy-docker-image
if [ $? -ne 0 ]
then
    log_error "Failed to push Docker image"
    exit 1
fi
log_task "Docker image pushed"

log_task "Start image scan in Artifactory"
xray_ready=0
while [ $xray_ready -eq 0 ]
do
jf xr cl api/v2/index \
-k \
--data '{ "repo_path": "academy-docker-local/academy-docker-image/latest/manifest.json"}' \
-H "Content-type: application/json" | grep 404
if [ $? -ne 0 ]
then
    xray_ready=1
else
    log_task "Xray is not ready yet, waiting..."
    sleep 20
fi
done

if [ $xray_ready -ne 1 ]
then
    log_error "Failed to start image scan"
    exit 1
fi
log_task "Image scan started"
log_task "Lab Setup Completed"
