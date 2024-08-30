#!/bin/bash

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to spin up Redis
spin_up_redis() {
    echo "Spinning up Redis..."
    docker compose -f docker/redis.yml up -d
    if [ $? -eq 0 ]; then
        echo "Redis is now running."
    else
        echo "Failed to start Redis. Please check the Docker logs for more information."
        exit 1
    fi
}

# Function to spin up MinIO
spin_up_minio() {
    echo "Spinning up MinIO..."
    docker compose -f docker/minio.yml up -d
    if [ $? -eq 0 ]; then
        echo "MinIO is now running."
    else
        echo "Failed to start MinIO. Please check the Docker logs for more information."
        exit 1
    fi
}

# Main execution
check_docker
spin_up_redis
spin_up_minio

echo "All services are up and running."
