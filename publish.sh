#!/bin/bash

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Build the project
echo "Building the project..."
npm run build

# If tests pass, publish
if [ $? -eq 0 ]; then
    # Save changes
    echo "Saving changes..."
    git add .
    git commit -m "Pre-publish cleanup"
    
    # Increment version
    echo "Incrementing version..."
    npm version patch

    # Push to GitHub
    echo "Pushing to GitHub..."
    git push origin main
    
    # Check if push was successful
    if [ $? -eq 0 ]; then
        echo "Changes pushed to GitHub successfully."
    else
        echo "Failed to push changes to GitHub. Aborting publish."
        exit 1
    fi
    
    echo "Tests passed. Publishing..."
    npm publish
    if [ $? -eq 0 ]; then
        echo "Package published successfully!"
    else
        echo "Failed to publish package."
        exit 1
    fi
else
    echo "Tests failed. Aborting publish."
    exit 1
fi
