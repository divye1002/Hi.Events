#!/bin/bash

echo "🚀 Hi.Events Render + Vercel Setup Script"
echo "=========================================="

# Check if this is the correct directory
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Please run this script from the hi.events directory."
    exit 1
fi

echo "📝 Updating render.yaml for production deployment..."

# Update render.yaml with correct values
cat > render.yaml << 'EOF'
services:
  - type: web
    name: hievents-backend
    env: docker
    rootDir: backend
    dockerfilePath: Dockerfile
    dockerContext: ../
    plan: starter
    region: oregon
    branch: main
    envVars:
      - key: APP_NAME
        value: Hi.Events
      - key: APP_ENV
        value: production
      - key: APP_KEY
        generateValue: true
      - key: APP_DEBUG
        value: false
      - key: APP_URL
        value: https://hievents-backend.onrender.com
      - key: APP_FRONTEND_URL
        value: https://hievents.vercel.app
      - key: APP_CDN_URL
        value: https://hievents-backend.onrender.com/storage
      
      # Database (PostgreSQL)
      - key: DB_CONNECTION
        value: pgsql
      - fromDatabase:
          name: hievents-db
          property: host
        key: DB_HOST
      - fromDatabase:
          name: hievents-db
          property: port
        key: DB_PORT
      - fromDatabase:
          name: hievents-db
          property: database
        key: DB_DATABASE
      - fromDatabase:
          name: hievents-db
          property: user
        key: DB_USERNAME
      - fromDatabase:
          name: hievents-db
          property: password
        key: DB_PASSWORD
      
      # Mail Configuration - UPDATE IN RENDER DASHBOARD
      - key: MAIL_MAILER
        value: smtp
      - key: MAIL_HOST
        value: smtp.postmarkapp.com
      - key: MAIL_PORT
        value: 587
      - key: MAIL_USERNAME
        value: YOUR_POSTMARK_TOKEN
      - key: MAIL_PASSWORD
        value: YOUR_POSTMARK_TOKEN
      - key: MAIL_ENCRYPTION
        value: tls
      - key: MAIL_FROM_ADDRESS
        value: divye@skoch.in
      - key: MAIL_FROM_NAME
        value: Hi.Events
      
      # Cache and Storage
      - key: CACHE_DRIVER
        value: file
      - key: FILESYSTEM_PUBLIC_DISK
        value: public
      - key: FILESYSTEM_PRIVATE_DISK
        value: local
      - key: QUEUE_CONNECTION
        value: database
      - key: SESSION_DRIVER
        value: file
      - key: SESSION_LIFETIME
        value: 120
      
      # Logging
      - key: LOG_CHANNEL
        value: stderr
      - key: LOG_LEVEL
        value: info
      
      # Security
      - key: JWT_SECRET
        value: noGIAxWm7SvT1vVqweRPlzsE0c7yJ00ZYGAKzz0iiszLyi6wCKj6HO86sT9GEYfr
      - key: JWT_ALGO
        value: HS256
      
      # CORS
      - key: CORS_ALLOWED_ORIGINS
        value: https://hievents.vercel.app,https://hievents-backend.onrender.com
      
      # Optional
      - key: APP_DISABLE_REGISTRATION
        value: false
      - key: APP_PLATFORM_SUPPORT_EMAIL
        value: divye@skoch.in

databases:
  - name: hievents-db
    databaseName: hievents
    user: hievents
    plan: starter

jobs:
  - type: job
    name: hievents-migrate
    env: docker
    rootDir: backend
    dockerfilePath: Dockerfile
    dockerContext: ../
    plan: starter
    startCommand: php artisan migrate --force
EOF

echo "📝 Updating frontend/vercel.json..."

# Update vercel.json
cat > frontend/vercel.json << 'EOF'
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client",
  "framework": null,
  "installCommand": "npm install",
  "env": {
    "VITE_API_URL_SERVER": "https://hievents-backend.onrender.com/api",
    "VITE_API_URL_CLIENT": "https://hievents-backend.onrender.com/api",
    "VITE_FRONTEND_URL": "https://hievents.vercel.app",
    "VITE_APP_NAME": "Hi.Events",
    "NODE_ENV": "production"
  },
  "functions": {
    "api/server.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/server"
    }
  ]
}
EOF

echo "✅ Configuration files updated!"
echo ""
echo "🔥 NEXT STEPS:"
echo "1. Commit and push these changes to your GitHub repo"
echo "2. Go to https://render.com and create a Blueprint from your repo"
echo "3. Go to https://vercel.com and import the frontend folder"
echo "4. Update MAIL_USERNAME and MAIL_PASSWORD in Render with your Postmark server token"
echo ""
echo "📧 Use your Postmark server token for both MAIL_USERNAME and MAIL_PASSWORD"
echo "📧 Your From email: divye@skoch.in"
echo ""
echo "🚀 Ready to deploy!"
