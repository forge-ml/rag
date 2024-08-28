#!/bin/bash

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to spin up the vector store
spin_up_vector_store() {
    echo "Spinning up the vector store..."
    docker compose -f docker/redis.yml up -d
    if [ $? -eq 0 ]; then
        echo "Vector store is now running."
    else
        echo "Failed to start the vector store. Please check the Docker logs for more information."
        exit 1
    fi
}

# Main execution
check_docker
spin_up_vector_store
