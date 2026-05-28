#!/bin/bash
set -e

echo "=== TIR Fleet TMS Deploy ==="

# ---- System packages ----
apt-get update -y
apt-get install -y python3 python3-pip python3-venv nginx git curl

# ---- Node.js 20 ----
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ---- Clone repo ----
cd /opt
if [ -d "tirfleet" ]; then
  cd tirfleet && git pull
else
  git clone https://github.com/berkinan974/tirfleet.git tirfleet
  cd tirfleet
fi

# ---- Python venv ----
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# ---- .env ----
if [ ! -f ".env" ]; then
  echo "TELEGRAM_BOT_TOKEN=BURAYA_BOT_TOKEN_YAZ" > .env
  echo "API_BASE_URL=http://localhost:8000" >> .env
  echo "PTI_MEDIA_DIR=/opt/tirfleet/media/pti" >> .env
  echo ""
  echo "!!! .env olusturuldu. /opt/tirfleet/.env dosyasini duzenle ve scripti tekrar calistir."
  exit 1
fi

# ---- Frontend build ----
cd /opt/tirfleet/frontend
npm install
npm run build

# ---- Nginx config ----
cat > /etc/nginx/sites-available/tirfleet <<'NGINX'
server {
    listen 80;
    server_name _;

    root /opt/tirfleet/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /media/ {
        alias /opt/tirfleet/media/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/tirfleet /etc/nginx/sites-enabled/tirfleet
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- Backend systemd service ----
cat > /etc/systemd/system/tir-backend.service <<EOF
[Unit]
Description=TIR Fleet Backend
After=network.target

[Service]
User=root
WorkingDirectory=/opt/tirfleet
EnvironmentFile=/opt/tirfleet/.env
ExecStart=/opt/tirfleet/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ---- Bot systemd service ----
cat > /etc/systemd/system/tir-bot.service <<EOF
[Unit]
Description=TIR Fleet Telegram Bot
After=network.target tir-backend.service

[Service]
User=root
WorkingDirectory=/opt/tirfleet
EnvironmentFile=/opt/tirfleet/.env
ExecStart=/opt/tirfleet/venv/bin/python -m bot.main
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tir-backend tir-bot
systemctl restart tir-backend tir-bot

echo ""
echo "=== DEPLOY TAMAMLANDI ==="
echo "Frontend: http://5.161.61.221"
echo "Backend:  http://5.161.61.221/api"
echo ""
echo "Servis durumu:"
systemctl is-active tir-backend && echo "  tir-backend: AKTIF" || echo "  tir-backend: HATA"
systemctl is-active tir-bot     && echo "  tir-bot:     AKTIF" || echo "  tir-bot:     HATA"
