# Deploy Web App (Ubuntu, reverse proxy on another server)

## 1. Prepare app server

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

## 2. Configure

```bash
cd deploy
cp .env.example .env
```

Edit `.env`:

- `APP_BIND_IP=0.0.0.0`
- `APP_PORT=8080`

## 3. Deploy

```bash
cd deploy
bash deploy.sh deploy
```

Useful commands:

```bash
bash deploy.sh status
bash deploy.sh logs
bash deploy.sh restart
bash deploy.sh down
```

## 4. Restrict access to proxy server only (recommended)

Allow app port only from reverse proxy IP:

```bash
sudo ufw allow from <REVERSE_PROXY_IP> to any port 8080 proto tcp
sudo ufw deny 8080/tcp
sudo ufw reload
```

## 5. Configure Nginx on reverse proxy server

Use `nginx-reverse-proxy.example.conf` as template.
