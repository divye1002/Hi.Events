#!/bin/sh

echo "🔄 Starting Hi.Events backend..."

# Start web server in background first
echo "🚀 Starting web server..."
/usr/local/bin/entrypoint.sh &
SERVER_PID=$!

# Give the server a moment to start
sleep 3

# Wait for database to be ready (with timeout)
echo "⏳ Waiting for database connection..."
TIMEOUT=120
COUNTER=0
until php artisan migrate:status > /dev/null 2>&1; do
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "❌ Database connection timeout after ${TIMEOUT} seconds"
        echo "⚠️  Starting server without migrations (migrations will be attempted later)"
        wait $SERVER_PID
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

echo "✅ Setup complete! Server is running."

# Wait for the server process
wait $SERVER_PID
