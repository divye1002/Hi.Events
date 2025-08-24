#!/bin/sh

echo "🔄 Hi.Events: Initializing application..."

# Start PHP-FPM in daemon mode
echo "🚀 Starting PHP-FPM..."
php-fpm -D

# Run migrations in background after services start
(
    echo "⏳ Waiting for services to start..."
    sleep 20
    
    # Try to run migrations
    echo "🔄 Running database migrations..."
    php artisan migrate --force 2>/dev/null || echo "⚠️ Migrations failed or already up to date"
    
    # Create storage link
    echo "🔗 Creating storage link..."
    php artisan storage:link --force 2>/dev/null || echo "⚠️ Storage link already exists"
    
    echo "✅ Application initialization complete"
) &

echo "🚀 Starting Nginx..."
# Start Nginx in foreground (this keeps the container running)
exec nginx -g "daemon off;"
