#!/bin/bash
echo "Running sensitive operations..."
# A database password
DB_PASSWORD="mySuperSecretDbPassword123!" 
echo "Connecting to database with password: $DB_PASSWORD"
# Simulating usage
curl -X POST -d "user=admin&pass=$DB_PASSWORD" http://internal-db-service/login