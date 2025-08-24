#!/bin/sh

echo "🔄 Hi.Events: Running database migrations..."

# Wait for database to be ready (with timeout)
echo "⏳ Waiting for database connection..."
TIMEOUT=60
COUNTER=0

# Test database connection more reliably
until php -r "
try {
    \$pdo = new PDO(\$_ENV['DATABASE_URL'] ?? 'pgsql:host='.\$_ENV['DB_HOST'].';port='.\$_ENV['DB_PORT'].';dbname='.\$_ENV['DB_DATABASE'], \$_ENV['DB_USERNAME'], \$_ENV['DB_PASSWORD']);
    echo 'Database connected successfully';
    exit(0);
} catch (Exception \$e) {
    exit(1);
}
" > /dev/null 2>&1; do
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "❌ Database connection timeout after ${TIMEOUT} seconds"
        echo "⚠️  Server will start without migrations"
        exit 0
    fi
    echo "Database not ready, waiting 5 seconds... (${COUNTER}/${TIMEOUT})"
    sleep 5
    COUNTER=$((COUNTER + 5))
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
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "✅ Database setup complete!"
