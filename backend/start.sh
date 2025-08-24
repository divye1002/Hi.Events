#!/bin/sh

echo "🔄 Starting Hi.Events backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until php artisan migrate:status > /dev/null 2>&1; do
    echo "Database not ready, waiting 5 seconds..."
    sleep 5
done

echo "✅ Database connected!"

# Run database migrations
echo "🔄 Running database migrations..."
php artisan migrate --force

# Generate storage link if it doesn't exist
echo "🔗 Creating storage link..."
php artisan storage:link --force || true

# Clear and cache configuration
echo "🧹 Clearing caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "🚀 Starting web server..."

# Start the original entrypoint
exec /usr/local/bin/entrypoint.sh "$@"
