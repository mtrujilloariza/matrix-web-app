#!/bin/bash

# Install dependencies and build the app
./build.sh

# Create necessary directories
mkdir -p /home/pi/matrix-web-app/dist
mkdir -p /home/pi/matrix-images

# Set correct permissions for the dist directory
echo "Setting permissions..."
sudo chown -R pi:www-data /home/pi/matrix-web-app/dist
sudo chmod -R 750 /home/pi/matrix-web-app/dist
sudo chmod g+s /home/pi/matrix-web-app/dist

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Backup original nginx config
sudo mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# Create new nginx config
sudo tee /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Create site configuration
sudo tee /etc/nginx/sites-available/matrix-web-app << 'EOF'
server {
    listen 4173;
    server_name localhost;

    root /home/pi/matrix-web-app/dist;
    index index.html;

    # Handle static files first
    location /static/ {
        alias /home/pi/matrix-web-app/dist/static/;
        expires 1y;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # Handle API requests
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle all other routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Prevent access to . files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Enable site configuration
sudo ln -sf /etc/nginx/sites-available/matrix-web-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

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
echo "To view nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "The UI will be available at: http://localhost:4173"
echo "The API server will be available at: http://localhost:3000" 