# Setup rapido (Hostinger-only)

## 1) Instalar Node LTS
```bash
source ~/.zshrc
nvm install --lts
nvm use --lts
```

## 2) Instalar dependencias
```bash
cd /Users/joaogirao/Desktop/Planner/planner-web
npm install
```

## 3) Configurar `.env.local`
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=SEU_DB
MYSQL_USER=SEU_USER
MYSQL_PASSWORD=SUA_PASSWORD
AUTH_SECRET=UMA_STRING_LONGA_E_ALEATORIA
```

## 4) Criar tabelas
No MySQL, executa:
- `db/schema.mysql.sql`

## 5) Correr app
```bash
npm run dev
```

Abrir: http://localhost:3000
