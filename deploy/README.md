# Deployment Instructions for AWS EC2

This setup runs your Node.js backend behind an **Nginx Reverse Proxy** using Docker Compose.

---

## Architecture:
- **Nginx Container (`bachat_nginx`)**: Listens on Port **`80`** (standard HTTP).
  - Automatically routes `/api/v1/...` to the backend.
  - Serves uploaded receipts/screenshots directly from `/uploads/` for fast static performance.
  - Passes real client IP and headers (`X-Real-IP`, `X-Forwarded-For`).
- **Backend Container (`bachat_backend`)**: Node.js Express server running on port `5000` (isolated in internal Docker network).

---

## 1. AWS EC2 Security Group
Ensure the following Inbound Rules are open on your EC2 instance:
- **Port 80 (HTTP)**: `0.0.0.0/0` (Standard web traffic for your app/Nginx)
- **Port 22 (SSH)**: Your IP or `0.0.0.0/0`

*(You no longer need to open port 5000 or 4000 to the public, as Nginx securely proxies everything through Port 80).*

---

## 2. Deploy on your EC2 Server

1. SSH into your EC2 instance:
   ```bash
   ssh -i your-key.pem ubuntu@13.205.253.105
   ```

2. Clone or copy your backend project to the server:
   ```bash
   git clone <your-repo-url>
   cd saving-app-backend
   ```

3. Ensure `.env` is created in `saving-app-backend/`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set your database credentials, `JWT_SECRET`, etc.

4. Run the deploy script:
   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```
   *(Or run manually)*:
   ```bash
   cd deploy
   docker compose up -d --build
   ```

---

## 3. Verify Deployment
Test directly in your terminal or browser:
```bash
curl http://13.205.253.105/api/v1/health
```
You should receive:
```json
{"success":true,"data":{"status":"ok","version":"v1"}}
```

---

## 4. Frontend Configuration
Now in your `saving-app-frontend/.env`, you can simply point to standard HTTP port 80 (no port number needed!):
```env
EXPO_PUBLIC_API_URL=http://13.205.253.105/api/v1
```
