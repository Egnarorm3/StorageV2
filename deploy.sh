#!/bin/bash

# Navigate to the project directory
cd /var/www/my-react-app

# Pull the latest changes from the main branch
git pull origin main

# Install dependencies
npm install

# Build the React app
npm run build

# Restart the app with PM2
pm2 restart react-app

# Save PM2 process list and resurrect on reboot
pm2 save
pm2 startup