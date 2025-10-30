# Deploying Your Node.js Backend on Render

This guide provides step-by-step instructions for deploying your Node.js backend on Render.

## Overview

This project has a `package.json` file in the root directory that defines the necessary dependencies and start script for the backend server. We will deploy this as a "Web Service" on Render.

## Step 1: Deploy the Backend on Render

1.  **Create a New Web Service**
    - Go to the [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
    - Connect your GitHub repository.

2.  **Configure the Backend Service**
    - **Name**: Give your service a name, for example `whatsapp-clone-server`.
    - **Root Directory**: Leave this blank to use the root of your repository.
    - **Branch**: `main` (or your default branch).
    - **Runtime**: `Node`.
    - **Build Command**: `npm install`.
    - **Start Command**: `npm start`.

3.  **Add Environment Variables**
    - Under the "Environment" section, add the following variables:
    - **Key**: `MONGODB_URI`, **Value**: Your MongoDB connection string.
    - **Key**: `CLIENT_URL`, **Value**: The URL of your frontend application. If you haven't deployed the frontend yet, you can use a placeholder like `http://localhost:5173` and update it later.

4.  **Deploy**
    - Click **Create Web Service**. Render will now build and deploy your application.

## Note on Frontend

The frontend React application (`react-app-with-api.js`) is not yet set up for deployment. To deploy it, you would typically use a tool like Vite or Create React App to build it into static files, and then deploy it as a "Static Site" on Render.
