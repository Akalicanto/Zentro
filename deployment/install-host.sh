#!/usr/bin/env bash
# Preparación de una VM NUEVA Ubuntu 24.04/26.04. No abre puertos ni arranca Zentro.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Ejecutar con sudo.' >&2; exit 1; }
source /etc/os-release
[[ $ID == ubuntu && ($VERSION_ID == 24.04 || $VERSION_ID == 26.04) ]] || { echo 'Solo Ubuntu 24.04/26.04.' >&2; exit 1; }
apt-get update
apt-get install -y ca-certificates curl gnupg python3 age git unattended-upgrades
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
chmod a+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin caddy
install -d -m 0700 /etc/zentro /var/lib/zentro/mail-backups
install -d -m 0700 -o 1654 -g 1654 /var/lib/zentro/data
install -m 0644 /opt/zentro/deployment/systemd/zentro-* /etc/systemd/system/
systemctl daemon-reload
echo 'Host preparado. Falta configurar acceso, DNS, datos y SMTP. Timers sin activar.'
