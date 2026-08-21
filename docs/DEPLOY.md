# Deploy System Barber na VPS

Guia completo passo a passo para fazer deploy do System Barber em um servidor VPS (DigitalOcean, Hetzner, AWS Lightsail, etc).

---

## Sumario

1. [Pre-requisitos](#1-pre-requisitos)
2. [Preparar a VPS](#2-preparar-a-vps)
3. [Instalar Docker](#3-instalar-docker)
4. [Clonar os repositorios](#4-clonar-os-repositorios)
5. [Configurar variaveis de ambiente](#5-configurar-variaveis-de-ambiente)
6. [Criar docker-compose.prod.yml](#6-criar-docker-composeprodyml)
7. [Configurar Nginx Reverse Proxy com SSL](#7-configurar-nginx-reverse-proxy-com-ssl)
8. [Build e subir os containers](#8-build-e-subir-os-containers)
9. [Verificar o deploy](#9-verificar-o-deploy)
10. [Atualizacoes futuras](#10-atualizacoes-futuras)
11. [Deploy Automatico (CD)](#11-deploy-automatico-cd-via-github-actions--ssh)
12. [Backup do banco de dados](#12-backup-do-banco-de-dados)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Pre-requisitos

- VPS com Ubuntu 22.04+ (minimo 2GB RAM, 1 vCPU, 25GB disco)
- Um dominio apontando para o IP da VPS (ex: `systembarber.com`)
- Acesso SSH ao servidor
- Git instalado na VPS

---

## 2. Preparar a VPS

Conecte no servidor via SSH:

```bash
ssh root@SEU_IP
```

Atualize o sistema e crie um usuario com sudo (nao use root para deploy):

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Instalar dependencias basicas
apt install -y curl git ufw

# Criar usuario de deploy
adduser deploy
usermod -aG sudo deploy

# Configurar firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Copie as chaves SSH para o usuario deploy:

```bash
# No seu computador local:
ssh-copy-id deploy@SEU_IP
```

Acesse como deploy:

```bash
ssh deploy@SEU_IP
```

---

## 3. Instalar Docker

```bash
# Instalar Docker via script oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuario deploy ao grupo docker (evita precisar de sudo)
sudo usermod -aG docker deploy

# Instalar Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Sair e entrar novamente para o grupo docker ter efeito
exit
```

Reconecte e verifique:

```bash
ssh deploy@SEU_IP
docker --version
docker compose version
```

---

## 4. Clonar os repositorios

```bash
# Criar diretorio do projeto
mkdir -p /opt/system-barber
cd /opt/system-barber

# Clonar backend e frontend
git clone https://github.com/JulioSilvaa/system-barber-back.git
git clone https://github.com/JulioSilvaa/system-barber-front.git
```

---

## 5. Configurar variaveis de ambiente

### 5.1 Gerar secrets

Execute estes comandos para gerar valores seguros:

```bash
# Gerar secrets (copie cada resultado)
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY
```

### 5.2 Gerar chaves VAPID (Push Notifications)

```bash
# Instalar web-push CLI
npm install -g web-push

# Gerar chaves VAPID
web-push generate-vapid-keys
```

### 5.3 Criar o arquivo .env na raiz do projeto

```bash
cd /opt/system-barber
nano .env
```

Cole o conteudo abaixo substituindo os valores:

```env
# ===========================================
# Postgres
# ===========================================
POSTGRES_DB=systembarber
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SUA_SENHA_FORTE_AQUI_2024

# ===========================================
# Backend
# ===========================================
PORT=3333
NODE_ENV=production

# JWT (use os valores gerados acima)
JWT_ACCESS_SECRET=cole_o_resultado_aqui
JWT_REFRESH_SECRET=cole_o_resultado_aqui

# Bcrypt
BCRYPT_SALT=14

# Criptografia (use o valor gerado acima)
ENCRYPTION_KEY=cole_o_resultado_aqui

# Admin inicial da plataforma (sera criado automaticamente)
ADMIN_NAME=Admin Sistema
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=SenhaAdmin123!

# ===========================================
# Asaas (opcional - assinaturas)
# ===========================================
ASAAS_API_URL=https://sandbox.asaas.com
ASAAS_API_KEY=CHAVE_AQUI
ASAAS_WEBHOOK_SECRET=SECRET_AQUI

# ===========================================
# Push Notifications VAPID (use as chaves geradas)
# ===========================================
VAPID_PUBLIC_KEY=cole_a_chave_publica
VAPID_PRIVATE_KEY=cole_a_chave_privada
VAPID_SUBJECT=mailto:admin@seudominio.com
```

Salve e saia (`Ctrl+X`, `Y`, `Enter`).

> **IMPORTANTE**: Nunca commite o arquivo `.env` no Git. Ele deve ficar apenas no servidor.

---

## 6. Criar docker-compose.prod.yml

Crie o arquivo de compose para producao:

```bash
cd /opt/system-barber
nano docker-compose.prod.yml
```

Cole o conteudo:

```yaml
# ===========================================
# System Barber - Docker Compose Producao
# ===========================================
# Arquivo: /opt/system-barber/docker-compose.prod.yml
#
# Uso:
#   docker compose -f docker-compose.prod.yml up -d --build
# ===========================================

services:
  # -------------------------------------------
  # PostgreSQL
  # -------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: sb-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      TZ: America/Sao_Paulo
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    volumes:
      - pgdata:/var/lib/postgresql/data
    # Seguranca: so acessivel internamente
    networks:
      - sb-internal

  # -------------------------------------------
  # Backend (Node.js + Express + Prisma)
  # -------------------------------------------
  backend:
    build:
      context: ./system-barber-back
      dockerfile: Dockerfile
    container_name: sb-backend
    restart: always
    environment:
      PORT: 3333
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      BCRYPT_SALT: ${BCRYPT_SALT}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      ASAAS_API_URL: ${ASAAS_API_URL}
      ASAAS_API_KEY: ${ASAAS_API_KEY}
      ASAAS_WEBHOOK_SECRET: ${ASAAS_WEBHOOK_SECRET}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_SUBJECT: ${VAPID_SUBJECT}
      TZ: America/Sao_Paulo
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - uploads_data:/app/uploads
    networks:
      - sb-internal

  # -------------------------------------------
  # Frontend (React + Nginx)
  # -------------------------------------------
  frontend:
    build:
      context: ./system-barber-front
      dockerfile: Dockerfile
    container_name: sb-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - sb-internal

  # -------------------------------------------
  # Nginx Reverse Proxy (acesso externo)
  # -------------------------------------------
  nginx-proxy:
    image: nginx:1.27-alpine
    container_name: sb-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
    networks:
      - sb-internal

volumes:
  pgdata:
  uploads_data:

networks:
  sb-internal:
    driver: bridge
```

Salve e saia.

---

## 7. Configurar Nginx Reverse Proxy com SSL

### 7.1 Criar o nginx-proxy.conf

```bash
cd /opt/system-barber
nano nginx-proxy.conf
```

Cole o conteudo:

```nginx
# ===========================================
# System Barber - Nginx Reverse Proxy
# ===========================================
# Redireciona todo trafego externo para o frontend
# O frontend por sua vez faz proxy reverso para o backend
# via container name "backend" na rede Docker
# ===========================================

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name systembarber.com www.systembarber.com;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect para HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name systembarber.com www.systembarber.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/systembarber.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/systembarber.com/privkey.pem;

    # Configuracoes SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Headers de seguranca
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # Tamanho maximo de upload (10MB para logos)
    client_max_body_size 10m;

    # Proxy para o frontend Docker
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket (socket.io)
    location /socket.io/ {
        proxy_pass http://frontend:80/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 7.2 Instalar Certbot e gerar certificado SSL

```bash
# Instalar Certbot
sudo apt install -y certbot

# Parar qualquer nginx que esteja rodando na porta 80
sudo systemctl stop nginx 2>/dev/null
sudo systemctl disable nginx 2>/dev/null

# Criar diretorio para certbot
sudo mkdir -p /var/www/certbot

# Gerar certificado (STOP antes do prompt de redirect)
sudo certbot certonly --standalone \
  -d systembarber.com \
  -d www.systembarber.com \
  --non-interactive \
  --agree-tos \
  --email admin@systembarber.com

# Verificar se o certificado foi criado
sudo ls /etc/letsencrypt/live/systembarber.com/
```

### 7.3 Configurar renovacao automatica do certificado

```bash
# Criar cron para renovacao automatica (2x ao dia)
sudo crontab -e
```

Adicione a linha:

```
0 3,15 * * * certbot renew --quiet --post-hook "docker restart sb-nginx"
```

---

## 8. Build e subir os containers

```bash
cd /opt/system-barber

# Build e subir tudo
docker compose -f docker-compose.prod.yml up -d --build
```

Aguarde o build terminar (pode levar alguns minutos na primeira vez).

Verifique se todos os containers estao rodando:

```bash
docker compose -f docker-compose.prod.yml ps
```

Saida esperada:

```
NAME          STATUS          PORTS
sb-postgres   running (healthy) 
sb-backend    running         0.0.0.0:3333->3333/tcp
sb-frontend   running         80/tcp
sb-nginx      running         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

Verificar logs do backend (pra confirmar que o Prisma migracao rodou e o admin foi criado):

```bash
docker compose -f docker-compose.prod.yml logs backend
```

Saida esperada (procura por):

```
Admin seeded: admin@seudominio.com
Server running on port 3333
```

---

## 9. Verificar o deploy

### 9.1 Testar via terminal

```bash
# Health check
curl -s https://systembarber.com/health | head -5

# Verificar se o frontend responde
curl -s -o /dev/null -w "%{http_code}" https://systembarber.com/

# Verificar se a API responde
curl -s -o /dev/null -w "%{http_code}" https://systembarber.com/api/health
```

### 9.2 Testar no navegador

1. Acesse `https://systembarber.com`
2. A Landing Page deve carregar
3. Faca login com o admin que voce configurou no `.env`
4. Verifique se o painel carrega corretamente

### 9.3 Verificar SSL

1. Clique no cadeado na barra de endereco
2. Deve mostrar "Conexao segura"
3. O certificado deve ser valido (Let's Encrypt)

---

## 10. Atualizacoes futuras

Quando houver atualizacoes no codigo, o fluxo de deploy e:

```bash
# Conectar no servidor
ssh deploy@SEU_IP

# Entrar no diretorio do projeto
cd /opt/system-barber

# Atualizar o codigo
cd system-barber-back && git pull origin main && cd ..
cd system-barber-front && git pull origin main && cd ..

# Rebuild e reiniciar
docker compose -f docker-compose.prod.yml up -d --build

# Verificar se tudo subiu
docker compose -f docker-compose.prod.yml ps
```

### Script de deploy automatizado (opcional)

Crie um script `deploy.sh` no `/opt/system-barber`:

```bash
nano deploy.sh
```

```bash
#!/bin/bash
set -e

echo "=== Deploy System Barber ==="
cd /opt/system-barber

echo "Atualizando codigo..."
cd system-barber-back && git pull origin main && cd ..
cd system-barber-front && git pull origin main && cd ..

echo "Rebuild e reiniciando containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Verificando status..."
docker compose -f docker-compose.prod.yml ps

echo "=== Deploy concluido ==="
```

```bash
chmod +x deploy.sh
```

Agora basta rodar:

```bash
./deploy.sh
```

---

## 11. Deploy Automatico (CD via GitHub Actions + SSH)

Voce pode configurar deploy automatico toda vez que fizer push no `main`. O GitHub Actions conecta via SSH na VPS e roda o deploy.

### 11.1 Preparar a VPS para SSH

No servidor, gere um par de chaves especifico para o GitHub Actions:

```bash
# Na VPS como usuario deploy
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /home/deploy/.ssh/github_deploy -N ""
```

Adicione a chave publica nas chaves autorizadas:

```bash
cat /home/deploy/.ssh/github_deploy.pub >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

Agora copie a chave PRIVADA (sera salva como secret no GitHub):

```bash
cat /home/deploy/.ssh/github_deploy
```

Copie **tudo** que aparecer (incluindo `-----BEGIN OPENSSH PRIVATE KEY-----` e `-----END OPENSSH PRIVATE KEY-----`).

### 11.2 Configurar secrets no GitHub

Va no repositorio do **backend** no GitHub:

> `Settings` > `Secrets and variables` > `Actions` > `New repository secret`

Crie estes secrets:

| Nome | Valor |
|------|-------|
| `DEPLOY_HOST` | IP da sua VPS (ex: `203.0.113.45`) |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | A chave privada inteira que copiou acima |
| `DEPLOY_PATH` | `/opt/system-barber` |

Repita o mesmo processo no repositorio do **frontend**.

### 11.3 Criar o workflow de CD

Crie o arquivo `.github/workflows/backend-cd.yml` no repo do **backend**:

```yaml
name: Backend CD

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            set -e
            cd ${{ secrets.DEPLOY_PATH }}

            echo "=== Pulling backend changes ==="
            cd system-barber-back
            git pull origin main

            echo "=== Rebuilding and restarting ==="
            cd ..
            docker compose -f docker-compose.prod.yml up -d --build backend

            echo "=== Verifying ==="
            docker compose -f docker-compose.prod.yml ps backend
            echo "=== Backend deploy complete ==="
```

E o arquivo `.github/workflows/frontend-cd.yml` no repo do **frontend**:

```yaml
name: Frontend CD

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            set -e
            cd ${{ secrets.DEPLOY_PATH }}

            echo "=== Pulling frontend changes ==="
            cd system-barber-front
            git pull origin main

            echo "=== Rebuilding and restarting ==="
            cd ..
            docker compose -f docker-compose.prod.yml up -d --build frontend nginx-proxy

            echo "=== Verifying ==="
            docker compose -f docker-compose.prod.yml ps frontend nginx-proxy
            echo "=== Frontend deploy complete ==="
```

### 11.4 Fluxo completo do CD

```
1. Voce faz push no main (backend ou frontend)
2. GitHub Actions detecta o push
3. Conecta via SSH na VPS usando a chave privada
4. Faz git pull no repositorio correspondente
5. Roda docker compose up -d --build (rebuild + restart)
6. O Prisma migrate roda automaticamente no startup do backend
7. O admin e criado automaticamente no startup do backend
8. Deploy concluido em ~2-3 minutos
```

### 11.5 Deploy completo (backend + frontend ao mesmo tempo)

Se voce faz push no backend e frontend ao mesmo tempo, crie um workflow combinado no repo do backend:

`.github/workflows/deploy.yml`:

```yaml
name: Deploy All

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            set -e
            cd ${{ secrets.DEPLOY_PATH }}

            echo "=== Pulling all changes ==="
            cd system-barber-back && git pull origin main && cd ..
            cd system-barber-front && git pull origin main && cd ..

            echo "=== Full rebuild and restart ==="
            docker compose -f docker-compose.prod.yml up -d --build

            echo "=== Status ==="
            docker compose -f docker-compose.prod.yml ps
            echo "=== Deploy complete ==="
```

Ative esse workflow manualmente em `Actions` > `Deploy All` > `Run workflow`.

### 11.6 Rollback manual

Se algo der errado no deploy:

```bash
# Na VPS, voltar para o commit anterior
cd /opt/system-barber/system-barber-back
git log --oneline -5          # ver os commits
git checkout COMMIT_ANTERIOR  # voltar para o commit anterior
cd /opt/system-barber

# Reconstruir com o commit anterior
docker compose -f docker-compose.prod.yml up -d --build backend
```

---

## 12. Backup do banco de dados

### 12.1 Backup manual

```bash
# Criar backup
docker exec sb-postgres pg_dump -U postgres systembarber > backup_$(date +%Y%m%d_%H%M%S).sql

# Salvar no seu computador
scp deploy@SEU_IP:/opt/system-barber/backup_*.sql .
```

### 12.2 Backup automatico local (cron diario)

```bash
# No servidor, criar script de backup
sudo nano /opt/system-barber/backup.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/system-barber/backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Dump do banco
docker exec sb-postgres pg_dump -U postgres systembarber > "$BACKUP_FILE"

# Comprimir
gzip "$BACKUP_FILE"

# Manter apenas ultimos 30 backups
ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +31 | xargs -r rm

echo "Backup salvo: $BACKUP_FILE.gz"
```

```bash
chmod +x /opt/system-barber/backup.sh

# Adicionar cron (todo dia as 3h da manha)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/system-barber/backup.sh >> /opt/system-barber/backups/cron.log 2>&1") | crontab -
```

### 12.3 Backup automatico no Google Drive (recomendado)

Usando **rclone** no servidor + **GitHub Actions** para sincronizar com o Google Drive.

#### Passo 1: Instalar rclone na VPS

```bash
curl https://rclone.org/install.sh | sudo bash

# Configurar rclone interativamente
rclone config
```

Durante a configuracao:

```
n) New remote
name> gdrive                          # nome da conexao
Storage> drive                        # Google Drive
client_id> <deixe em branco>
client_secret> <deixe em branco>
scope> 1                              # Full access
root_folder_id> <deixe em branco>
service_account_file> <deixe em branco>
Edit advanced config> n
Use auto config> y                    # vai abrir o navegador para autenticar
Configure as shared drives> n
y) Yes this is OK
q) Quit config
```

Teste se funcionou:

```bash
rclone ls gdrive: | head -5
```

#### Passo 2: Criar pasta de backups no Google Drive

```bash
mkdir -p /opt/system-barber/backups
```

#### Passo 3: Atualizar o script de backup com upload para o Google Drive

```bash
nano /opt/system-barber/backup.sh
```

Substitua pelo conteudo:

```bash
#!/bin/bash
# ===========================================
# System Barber - Backup + Google Drive Sync
# ===========================================
set -e

BACKUP_DIR="/opt/system-barber/backups"
GDRIVE_REMOTE="gdrive"
GDRIVE_PATH="SystemBarber/backups"
KEEP_LOCAL=7    # manter 7 backups locais
KEEP_REMOTE=30  # manter 30 backups no Google Drive

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
LOG_FILE="$BACKUP_DIR/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Dump do banco
log "Iniciando backup do banco de dados..."
docker exec sb-postgres pg_dump -U postgres systembarber > "$BACKUP_FILE"

# Comprimir
gzip "$BACKUP_FILE"
BACKUP_GZ="$BACKUP_FILE.gz"
log "Backup criado: $BACKUP_GZ ($(du -h "$BACKUP_GZ" | cut -f1))"

# Upload para Google Drive
log "Enviando para Google Drive..."
rclone copy "$BACKUP_GZ" "$GDRIVE_REMOTE:$GDRIVE_PATH/" --progress 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    log "Upload concluido com sucesso!"
else
    log "ERRO no upload para Google Drive!"
    exit 1
fi

# Limpar backups locais antigos
cd "$BACKUP_DIR"
ls -t backup_*.sql.gz 2>/dev/null | tail -n +$((KEEP_LOCAL + 1)) | xargs -r rm
log "Locais mantidos: $KEEP_LOCAL"

# Limpar backups remotos antigos
rclone delete "$GDRIVE_REMOTE:$GDRIVE_PATH/" \
    --min-age "${KEEP_REMOTE}d" \
    --include "backup_*.sql.gz" \
    2>/dev/null || true
log "Remotos mantidos: $KEEP_REMOTE dias"

log "Backup completo!"
```

```bash
chmod +x /opt/system-barber/backup.sh
```

#### Passo 4: Atualizar o cron

```bash
# Remover cron anterior e adicionar o novo
(crontab -l 2>/dev/null | grep -v backup.sh; echo "0 3 * * * /opt/system-barber/backup.sh >> /opt/system-barber/backups/cron.log 2>&1") | crontab -
```

#### Passo 5: Verificar o backup automatico

```bash
# Rodar manualmente para testar
/opt/system-barber/backup.sh

# Verificar se aparece no Google Drive
rclone ls gdrive:SystemBarber/backups/ | tail -5

# Verificar o log
cat /opt/system-barber/backups/backup.log
```

### 12.4 Backup via GitHub Actions (alternativa ao cron)

Se preferir que o GitHub Actions faca o backup (com mais controle e historico):

Crie `.github/workflows/backup.yml` no repo do **backend**:

```yaml
name: Database Backup

on:
  schedule:
    # Todo dia as 3h da manha (horario de Brasilia = UTC-3 = 06:00 UTC)
    - cron: '0 6 * * *'

  workflow_dispatch:  # permite rodar manualmente

permissions:
  contents: read

env:
  GDRIVE_BACKUP_DIR: SystemBarber/backups

jobs:
  backup:
    runs-on: ubuntu-latest

    steps:
      - name: Backup via SSH + Upload Google Drive
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            set -e
            cd /opt/system-barber

            DATE=$(date +%Y%m%d_%H%M%S)
            BACKUP_FILE="/tmp/backup_$DATE.sql.gz"

            echo "=== Dump do banco ==="
            docker exec sb-postgres pg_dump -U postgres systembarber | gzip > "$BACKUP_FILE"
            echo "Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"

            echo "=== Upload para Google Drive ==="
            rclone copy "$BACKUP_FILE" "gdrive:${{ env.GDRIVE_BACKUP_DIR }}/" --progress

            echo "=== Limpeza de backups antigos (>${{ secrets.BACKUP_KEEP_DAYS || 30 }} dias) ==="
            KEEP_DAYS=${{ secrets.BACKUP_KEEP_DAYS || 30 }}
            rclone delete "gdrive:${{ env.GDRIVE_BACKUP_DIR }}/" \
              --min-age "${KEEP_DAYS}d" \
              --include "backup_*.sql.gz" || true

            rm -f "$BACKUP_FILE"

            echo "=== Backup concluido ==="
```

Adicione o secret `BACKUP_KEEP_DAYS` (opcional, padrao 30 dias) no GitHub:

> `Settings` > `Secrets` > `New repository secret`
> Nome: `BACKUP_KEEP_DAYS` | Valor: `30`

### 12.5 Restaurar backup

#### Restaurar do backup local

```bash
# Copiar o arquivo .sql para o servidor
scp backup_20240101_030000.sql.gz deploy@SEU_IP:/opt/system-barber/

# Descomprimir e restaurar
gunzip backup_20240101_030000.sql.gz
docker exec -i sb-postgres psql -U postgres systembarber < backup_20240101_030000.sql
```

#### Restaurar do Google Drive

```bash
# Listar backups disponiveis no Google Drive
rclone ls gdrive:SystemBarber/backups/ --max-depth 1

# Baixar o backup desejado
rclone copy gdrive:SystemBarber/backups/backup_20240101_030000.sql.gz /tmp/

# Restaurar
gunzip /tmp/backup_20240101_030000.sql.gz
docker exec -i sb-postgres psql -U postgres systembarber < /tmp/backup_20240101_030000.sql

# Limpar arquivo temporario
rm /tmp/backup_20240101_030000.sql
```

### 12.6 Estrutura final dos backups

```
Google Drive/
└── SystemBarber/
    └── backups/
        ├── backup_20240115_030000.sql.gz   (15 jan)
        ├── backup_20240116_030000.sql.gz   (16 jan)
        ├── backup_20240117_030000.sql.gz   (17 jan)
        └── ... (ultimos 30 dias)

VPS (local)/
└── /opt/system-barber/backups/
    ├── backup_20240115_030000.sql.gz
    ├── backup_20240116_030000.sql.gz
    └── ... (ultimos 7 dias)
```

---

## 13. Troubleshooting

### Containers nao sobem

```bash
# Ver logs de todos os containers
docker compose -f docker-compose.prod.yml logs

# Ver logs de um container especifico
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs postgres
```

### Erro de conexao com banco

```bash
# Verificar se o postgres esta saudavel
docker exec sb-postgres pg_isready -U postgres

# Verificar as variaveis de ambiente
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

### Erro 502 Bad Gateway no Nginx

```bash
# Verificar se o frontend esta rodando
docker compose -f docker-compose.prod.yml ps frontend

# Verificar se o backend esta rodando
docker compose -f docker-compose.prod.yml ps backend

# Testar conexao interna
docker compose -f docker-compose.prod.yml exec frontend curl -s http://backend:3333/health
```

### SSL nao funciona

```bash
# Verificar certificados
sudo ls /etc/letsencrypt/live/systembarber.com/

# Renovar manualmente
sudo certbot renew

# Reiniciar nginx
docker restart sb-nginx
```

### Porta 80 ou 443 ja em uso

```bash
# Verificar o que esta usando a porta
sudo lsof -i :80
sudo lsof -i :443

# Matar o processo se necessario
sudo systemctl stop nginx
```

### Rebuild completo (limpar tudo)

```bash
# ATENCAO: isso apaga o banco de dados e volumes!
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

### Limpar imagens Docker antigas

```bash
docker system prune -a --volumes
```

---

## Arquitetura final

```
Internet
    |
    v
[Port80/443] nginx-proxy (Let's Encrypt SSL)
    |
    v
[Port80] frontend (React SPA via Nginx)
    |  /api/* -> proxy reverso
    |  /socket.io/* -> proxy reverso WebSocket
    v
[Port3333] backend (Express + Prisma)
    |
    v
[Port5432 interna] postgres (PostgreSQL 16)
```

- **Acesso externo**: apenas porta80 e 443
- **Banco de dados**: nao exposto externamente (somente rede Docker interna)
- **Uploads**: persistidos em volume Docker `uploads_data`
- **Admin inicial**: criado automaticamente pelo backend no startup
