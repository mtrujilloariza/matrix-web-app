#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p ~/matrix-images

# Install the service
echo "Installing the service..."
sudo cp matrix-web-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable matrix-web-app
sudo systemctl start matrix-web-app

echo "Setup complete! The application is now running as a service."
echo "You can check its status with: sudo systemctl status matrix-web-app"
echo "To stop it: sudo systemctl stop matrix-web-app"
echo "To start it: sudo systemctl start matrix-web-app"
echo "To restart it: sudo systemctl restart matrix-web-app"
echo ""
echo "The UI will be available at: http://localhost:4173"
echo "The API server will be available at: http://localhost:3000" 