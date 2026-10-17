# Production Deployment Guide — DURGA LODGE HMS

This guide provides instructions for deploying **DURGA LODGE HMS** in production using Docker Compose, standalone Node.js, or behind a secure Cloudflare Tunnel.

---

## 1. System Requirements

- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12 / Rocky Linux), macOS, or Windows Server
- **CPU**: 2 Cores minimum (4 Cores recommended)
- **RAM**: 2 GB minimum (4 GB recommended)
- **Disk**: 20 GB SSD storage
- **Docker**: Docker Engine 24+ and Docker Compose v2+

---

## 2. Docker Compose Deployment (Recommended)

### Step 1: Clone and Configure Environment
```bash
git clone <repository-url> /opt/durga-lodge-hms
cd /opt/durga-lodge-hms
cp .env.example .env
```

Edit `.env` and set strong production secrets:
```env
# Database Credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=generate_a_very_strong_password_here
POSTGRES_DB=durga_lodge
DATABASE_URL="postgresql://admin:generate_a_very_strong_password_here@postgres:5432/durga_lodge?schema=public"

# Session Security (32+ character random secret)
AUTH_SECRET="d8f7b2a9e4c1f6a3b8d0e5c2a7f1b9d4e6c8a0f2b5d7e9c1"

# Hotel Regional Settings
HOTEL_TIMEZONE="Asia/Kolkata"
CURRENCY="INR"
```

### Step 2: Build and Launch Containers
```bash
docker compose up -d --build
```

### Step 3: Initialize Database Schema & Seed
```bash
# Push schema and seed initial 16 rooms and admin user
docker compose exec app npm run db:sync
docker compose exec app npm run seed
```

### Step 4: Verify Health
```bash
docker compose ps
docker compose logs -f app
```
The application will be live at `http://<your-server-ip>:3000`.

---

## 3. Remote Access with Cloudflare Tunnel (Zero Trust)

Cloudflare Tunnel exposes DURGA LODGE HMS securely to the internet without opening router ports, configuring NAT, or requiring a static public IP address.

### Step 1: Obtain Tunnel Token
1. Go to **Cloudflare Zero Trust Dashboard** → **Networks** → **Tunnels**.
2. Click **Create a Tunnel** (name it `durga-lodge-pms`).
3. Select Docker and copy the `TUNNEL_TOKEN` (starts with `eyJh...`).
4. In the **Public Hostname** tab, configure:
   - **Subdomain**: `pms`
   - **Domain**: `yourhoteldomain.com`
   - **Service Type**: `HTTP`
   - **URL**: `app:3000`

### Step 2: Configure & Launch Cloudflare Service
Add the token to your `.env`:
```env
CLOUDFLARE_TUNNEL_TOKEN="eyJh..."
```

Launch with the `tunnel` Docker profile:
```bash
docker compose --profile tunnel up -d
```
Your PMS is now securely accessible globally over HTTPS at `https://pms.yourhoteldomain.com`.

---

## 4. Standalone Host Deployment (PM2 + Systemd)

If deploying directly on a Linux VM without Docker:

### Step 1: Install Dependencies & Build
```bash
npm ci
npx prisma generate
npm run db:sync
npm run seed
npm run build
```

### Step 2: Configure PM2 Process Manager
```bash
npm install -g pm2
pm2 start npm --name "durga-lodge-hms" -- start
pm2 startup
pm2 save
```

### Step 3: Reverse Proxy with Nginx
```nginx
server {
    listen 80;
    server_name pms.durgalodge.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Obtain free SSL with Certbot:
```bash
sudo certbot --nginx -d pms.durgalodge.in
```

---

## 5. Post-Deployment Verification Checklist

- [ ] Visit `/login` and sign in with `admin@durgalodge.com`.
- [ ] Change the default password from the user settings panel.
- [ ] Verify that all 16 rooms (101-115, 201-203) are present in `/rooms`.
- [ ] Verify GST tax settings in `/settings`.
- [ ] Test creating a booking and ensure double-booking conflicts are rejected.
- [ ] Run a test backup using `./scripts/backup.sh`.
