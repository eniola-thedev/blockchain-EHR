# Render Deployment Guide for MedChain Backend

This guide walks you through deploying the MedChain backend to Render.

## Prerequisites

- A Render account (sign up at [render.com](https://render.com))
- Your code pushed to GitHub (already configured: `https://github.com/eniola-thedev/blockchain-EHR.git`)
- A MongoDB database (Render offers MongoDB via their marketplace, or use MongoDB Atlas)

## Package.json Status ✅

Your `package.json` is now properly configured for Render:

```json
{
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node server.js"
  }
}
```

Key configurations:
- ✅ **Start script**: `node server.js` - Render uses this to start your app
- ✅ **Node engine**: Specifies Node.js 18+ (Render will use this version)
- ✅ **Main entry**: `server.js` is correctly set
- ✅ **PORT handling**: Server already uses `process.env.PORT` (Render sets this automatically)
- ✅ **Health check**: `/health` endpoint exists for Render's health checks

## Step-by-Step Deployment

### 1. Connect Your Repository

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select the repository: `eniola-thedev/blockchain-EHR`

### 2. Configure the Web Service

| Setting | Value |
|---------|-------|
| **Name** | `medchain-backend` (or your preferred name) |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | `ehr-blockchain/backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or paid for production) |

### 3. Set Environment Variables

In the Render dashboard, go to **Environment** tab and add these variables:

#### Required Variables

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `MONGODB_URI` | Your MongoDB connection string | Use MongoDB Atlas or Render MongoDB |
| `JWT_SECRET` | A secure random string (min 32 chars) | Generate: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | 64 hex characters | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_URL` | Your frontend URL | e.g., `https://your-frontend.onrender.com` |

#### Blockchain Variables (Optional)

| Key | Value | Notes |
|-----|-------|-------|
| `BLOCKCHAIN_RPC_URL` | Your blockchain RPC URL | e.g., Infura, Alchemy, or local node |
| `PRIVATE_KEY` | Your wallet private key | Keep secure! |
| `EHR_REGISTRY_ADDRESS` | Deployed EHR registry contract address | |
| `HOSPITAL_REGISTRY_ADDRESS` | Deployed hospital registry contract address | |

#### IPFS Variables (Optional)

| Key | Value | Notes |
|-----|-------|-------|
| `IPFS_API_URL` | Your IPFS node URL | e.g., Pinata, Infura IPFS |
| `IPFS_GATEWAY` | IPFS gateway URL | e.g., `https://ipfs.io/ipfs` |

### 4. Deploy

1. Click **"Create Web Service"**
2. Render will build and deploy your application
3. Monitor the deployment in the **Logs** tab

### 5. Verify Deployment

After deployment, test your API:

```bash
# Replace with your Render URL
curl https://medchain-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## MongoDB Setup Options

### Option 1: MongoDB Atlas (Recommended)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string (use MongoDB for VS Code or Atlas UI)
3. Set as `MONGODB_URI` in Render

Example connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/medchain?retryWrites=true&w=majority
```

### Option 2: Render MongoDB

1. In Render dashboard, create a new **MongoDB** database
2. Connect it to your web service
3. Render will automatically set the `MONGODB_URI` environment variable

## Troubleshooting

### Build Failures

If the build fails, check:
1. **Root Directory**: Must be `ehr-blockchain/backend`
2. **Node version**: Ensure your code is compatible with Node 18+
3. **Dependencies**: All dependencies should be in `package.json`

### Runtime Errors

1. Check **Logs** in Render dashboard for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB connection string is valid

### Common Issues

**"Cannot find module" errors:**
- Make sure all required files are committed to Git
- Check that `node_modules` is in `.gitignore` (it is)

**MongoDB connection failures:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas network access (allow all IPs: `0.0.0.0/0`)
- Ensure database user has correct permissions

**CORS errors:**
- Update `CLIENT_URL` to match your frontend URL
- Ensure frontend is making requests to the correct API URL

## Updating Your Deployment

After the initial deployment, Render will automatically deploy when you push to your connected branch.

To manually trigger a deployment:
1. Go to your service in Render dashboard
2. Click **"Manual Deploy"**
3. Select the branch and click **"Deploy"**

## Production Considerations

For production deployment:

1. **Upgrade Instance Type**: Free instances sleep after 15 minutes of inactivity
2. **Use a Custom Domain**: Configure in Render's **Settings** tab
3. **Enable HTTPS**: Automatic with Render
4. **Set up Monitoring**: Use Render's built-in metrics or integrate with external tools
5. **Database Backups**: Enable automated backups for MongoDB
6. **Secrets Management**: Consider using Render's Secrets or external secret management

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community Forum](https://community.render.com)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas)