#!/bin/bash

# Install dependencies and build the app
./build.sh

# Create necessary directories
mkdir -p /home/pi/matrix-web-app/dist
mkdir -p /home/pi/matrix-images

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/matrix-web-app
sudo ln -sf /etc/nginx/sites-available/matrix-web-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Install the service
echo "Installing service..."
sudo cp matrix-web-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable matrix-web-app
sudo systemctl start matrix-web-app

# Restart nginx to apply changes
sudo systemctl restart nginx

echo "Setup complete! The app should now be running."
echo "You can check the status with: sudo systemctl status matrix-web-app"
echo "To view logs: sudo journalctl -u matrix-web-app -f"
echo ""
echo "The UI will be available at: http://localhost:4173"
echo "The API server will be available at: http://localhost:3000" 