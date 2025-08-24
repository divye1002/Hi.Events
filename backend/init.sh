#!/bin/sh

echo "🔄 Hi.Events: Initializing application..."

# Run migrations in background (non-blocking)
(
    echo "⏳ Waiting for database connection..."
    sleep 10
    
    # Try to run migrations
    echo "🔄 Running database migrations..."
    php artisan migrate --force 2>/dev/null || echo "⚠️ Migrations failed or already up to date"
    
    # Create storage link
    echo "🔗 Creating storage link..."
    php artisan storage:link --force 2>/dev/null || echo "⚠️ Storage link already exists"
    
    echo "✅ Application initialization complete"
) &

echo "🚀 Starting web server..."
exec "$@"
