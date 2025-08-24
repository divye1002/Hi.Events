#!/bin/bash

# Render startup script for Hi.Events backend
set -e

echo "Starting Hi.Events backend deployment..."

# Create database if it doesn't exist (for SQLite)
if [ ! -f /tmp/database.sqlite ]; then
    echo "Creating SQLite database..."
    touch /tmp/database.sqlite
    chmod 666 /tmp/database.sqlite
fi

# Clear and optimize Laravel caches
echo "Clearing Laravel caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Generate application key if not set
echo "Generating application key..."
php artisan key:generate --force

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Create storage link
echo "Creating storage link..."
php artisan storage:link

# Optimize for production
echo "Optimizing for production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set proper permissions
echo "Setting permissions..."
chmod -R 755 storage
chmod -R 755 bootstrap/cache

echo "Hi.Events backend deployment complete!"

# Start the application
exec "$@"
