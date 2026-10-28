#!/usr/bin/env bash
# One-time setup for a fresh VPS (Ubuntu 22.04/24.04). Copy to the server and run as root:
#   scp deploy/setup-server.sh root@<VPS_IP>:~ && ssh root@<VPS_IP> bash setup-server.sh soundeffectpro.com
# Safe to re-run.
set -euo pipefail
DOMAIN="${1:?usage: setup-server.sh <domain>}"
REPO_DIR=/var/www/sfx2
REPO=git@github.com:Kumarsj420/soundeffectpro-v3.git
DEPLOY_KEY=/root/.ssh/github_deploy

echo "==> Installing packages"
apt-get update -q
apt-get install -y -q curl git nginx ffmpeg ufw
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -q nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

# `next build` peaks around 2-3GB; swap is a safety net on small plans
if ! swapon --show | grep -q /swapfile; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

ufw allow OpenSSH >/dev/null && ufw allow 'Nginx Full' >/dev/null && ufw --force enable

# Read-only GitHub deploy key so the server can pull the (private) repo
if [ ! -f "$DEPLOY_KEY" ]; then
    mkdir -p /root/.ssh && chmod 700 /root/.ssh
    ssh-keygen -t ed25519 -N "" -C "sfx2-vps" -f "$DEPLOY_KEY" >/dev/null
    cat >> /root/.ssh/config <<CFG
Host github.com
    IdentityFile $DEPLOY_KEY
    IdentitiesOnly yes
CFG
    ssh-keyscan -q github.com >> /root/.ssh/known_hosts 2>/dev/null
fi

if [ ! -d "$REPO_DIR/.git" ]; then
    if ! git clone -q "$REPO" "$REPO_DIR" 2>/dev/null; then
        echo
        echo "!! Can't clone the repo yet. Add this key on GitHub:"
        echo "   repo → Settings → Deploy keys → Add deploy key (read-only)"
        echo
        cat "$DEPLOY_KEY.pub"
        echo
        echo "Then re-run this script."
        exit 1
    fi
fi

echo "==> Configuring nginx"
sed "s/__DOMAIN__/$DOMAIN/g" "$REPO_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/sfx2
ln -sf /etc/nginx/sites-available/sfx2 /etc/nginx/sites-enabled/sfx2
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

pm2 startup systemd -u root --hp /root >/dev/null

echo
echo "==> Server ready. Next:"
echo "   1. nano $REPO_DIR/.env.production   (paste your Vercel env vars)"
echo "   2. bash $REPO_DIR/deploy/deploy.sh"
