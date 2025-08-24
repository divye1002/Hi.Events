# Hi.Events Frontend Deployment Guide

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository: `divye1002/Hi.Events`
3. **Important**: Set the Root Directory to `frontend`
4. Vercel will auto-detect it as a Vite project

## Environment Variables for Vercel

Add these in Vercel project settings → Environment Variables:

```
VITE_API_URL_SERVER=https://hievents-backend.onrender.com/api
VITE_API_URL_CLIENT=https://hievents-backend.onrender.com/api
VITE_FRONTEND_URL=https://your-project-name.vercel.app
VITE_APP_NAME=Hi.Events
NODE_ENV=production
```

## Build Settings

- Build Command: `npm run build:ssr:client` or `npm run build`
- Output Directory: `dist/client`
- Install Command: `npm install --legacy-peer-deps`

## If Build Fails

Try these build commands in order:
1. `npm install --legacy-peer-deps && npm run build:ssr:client`
2. `npm install --legacy-peer-deps && npm run build`
3. `npm install --force && npm run build`

## After Deployment

Update your backend CORS settings in Render to include your new Vercel URL:
```
CORS_ALLOWED_ORIGINS=https://your-project-name.vercel.app,https://hievents-backend.onrender.com
```
