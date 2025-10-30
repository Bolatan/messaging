# Deploying Your Full-Stack WhatsApp Clone on Render

This guide provides step-by-step instructions for deploying your full-stack WhatsApp clone on Render. The application consists of a React frontend and a Node.js backend, which will be deployed as two separate services.

## Project Structure

Before deploying, you'll need to organize your project into a monorepo structure with a `client` directory for the frontend and a `server` directory for the backend.

```
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── Chat.js
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   └── server.js
└── README.md
```

## Step 1: Prepare the Backend for Deployment

1.  **Create a `package.json` for the Server**

    If you don't already have one, create a `package.json` file in the `server` directory and add the following scripts and dependencies.

    ```json
    {
      "name": "whatsapp-clone-server",
      "version": "1.0.0",
      "main": "server.js",
      "type": "module",
      "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js"
      },
      "dependencies": {
        "cors": "^2.8.5",
        "dotenv": "^16.0.3",
        "express": "^4.18.2",
        "mongoose": "^7.0.3",
        "socket.io": "^4.6.1"
      },
      "devDependencies": {
        "nodemon": "^2.0.22"
      }
    }
    ```

2.  **Update Server Code**

    Ensure your `server.js` file is correctly set up to connect to MongoDB and handle socket connections. Your existing `server-code.js` should work fine.

## Step 2: Prepare the Frontend for Deployment

1.  **Create a `package.json` for the Client**

    In the `client` directory, create a `package.json` file with the necessary dependencies for your React app.

    ```json
    {
      "name": "whatsapp-clone-client",
      "version": "1.0.0",
      "private": true,
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "serve": "vite preview"
      },
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "socket.io-client": "^4.6.1",
        "lucide-react": "^0.123.0"
      },
      "devDependencies": {
        "@vitejs/plugin-react": "^3.1.0",
        "vite": "^4.2.0"
      }
    }
    ```

2.  **Configure Environment Variables**

    In `react-app-with-api.js`, make sure you are using environment variables to connect to your backend API.

    ```javascript
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    ```

## Step 3: Deploy the Backend on Render

1.  **Create a New Web Service**

    - Go to the Render Dashboard and click **New > Web Service**.
    - Connect your GitHub repository.

2.  **Configure the Backend Service**

    - **Name**: `whatsapp-clone-server`
    - **Root Directory**: `server`
    - **Branch**: `main`
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`

3.  **Add Environment Variables**

    - `MONGODB_URI`: Your MongoDB connection string.
    - `CLIENT_URL`: The URL of your deployed frontend (you'll get this after deploying the client).

## Step 4: Deploy the Frontend on Render

1.  **Create a New Static Site**

    - In the Render Dashboard, click **New > Static Site**.
    - Select the same GitHub repository.

2.  **Configure the Frontend Service**

    - **Name**: `whatsapp-clone-client`
    - **Root Directory**: `client`
    - **Branch**: `main`
    - **Build Command**: `npm install && npm run build`
    - **Publish Directory**: `dist`

3.  **Add Environment Variables**

    - `VITE_API_URL`: The URL of your deployed backend service (e.g., `https://whatsapp-clone-server.onrender.com`).
    - `VITE_SOCKET_URL`: The same URL as your backend service.

By following these steps, you can successfully deploy your full-stack application on Render.
