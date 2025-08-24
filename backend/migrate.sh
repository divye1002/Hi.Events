#!/bin/sh

echo "🔄 Hi.Events: Background migration starting..."

# Wait for the main application to start
sleep 30

echo "⏳ Attempting database migrations..."

# Try to run migrations
if php artisan migrate --force 2>/dev/null; then
    echo "✅ Database migrations completed successfully"
else
    echo "⚠️ Database migrations failed or already up to date"
fi

# Create storage link
if php artisan storage:link --force 2>/dev/null; then
    echo "✅ Storage link created successfully" 
else
    echo "⚠️ Storage link already exists"
fi

echo "✅ Background initialization complete"
