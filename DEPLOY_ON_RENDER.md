# Deploying Your Full-Stack WhatsApp Clone on Render

This guide provides step-by-step instructions for deploying your full-stack WhatsApp clone on Render. The application is structured as a monorepo with a `client` directory for the React frontend and a `server` directory for the Node.js backend. We will deploy them as two separate services.

## Part 1: Deploy the Backend (Web Service)

1.  **Go to the Render Dashboard** and click **New > Web Service**.
2.  **Connect your GitHub repository**.
3.  **Configure the Backend Service**:
    - **Name**: `whatsapp-clone-server` (or your preferred name).
    - **Root Directory**: `server`.
    - **Branch**: `main` (or your default branch).
    - **Runtime**: `Node`.
    - **Build Command**: `npm install`.
    - **Start Command**: `npm start`.
4.  **Add Environment Variables**:
    - Under the "Environment" section, add the following:
      - **Key**: `MONGODB_URI`, **Value**: Your MongoDB connection string.
      - **Key**: `CLIENT_URL`, **Value**: The URL of your deployed frontend (you'll get this in the next part). For now, you can use a placeholder like `http://localhost:5173`.
5.  **Deploy**: Click **Create Web Service**.

## Part 2: Deploy the Frontend (Static Site)

1.  **Go to the Render Dashboard** and click **New > Static Site**.
2.  **Select the same GitHub repository**.
3.  **Configure the Frontend Service**:
    - **Name**: `whatsapp-clone-client` (or your preferred name).
    - **Root Directory**: `client`.
    - **Branch**: `main` (or your default branch).
    - **Build Command**: `npm install && npm run build`.
    - **Publish Directory**: `dist`.
4.  **Add Environment Variables**:
    - Under the "Environment" section, add the following:
      - **Key**: `VITE_API_URL`, **Value**: The URL of your deployed backend service (e.g., `https://whatsapp-clone-server.onrender.com`).
      - **Key**: `VITE_SOCKET_URL`, **Value**: The same URL as your backend service.
5.  **Deploy**: Click **Create Static Site**.

## Final Step: Update `CLIENT_URL`

Once your frontend is deployed, copy its URL and go back to your backend service's settings on Render. Update the `CLIENT_URL` environment variable with the frontend's URL to ensure proper cross-origin resource sharing (CORS).
