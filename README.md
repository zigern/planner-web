# Planner Web (Hostinger-only)

Stack:
- Next.js + React + Tailwind
- MySQL (Hostinger)
- Auth própria com cookie de sessão (JWT)

## 1) Instalar dependencias
```bash
npm install
```

## 2) Variaveis de ambiente
Cria `.env.local`:
```env
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
AUTH_SECRET=
APP_ALLOWED_ORIGINS=http://localhost:3000
ENABLE_DEMO_DATA=false
```

`AUTH_SECRET` pode ser uma string longa aleatória.
`APP_ALLOWED_ORIGINS` aceita uma ou mais origins separadas por vírgula (ex.: domínio final + localhost).
`ENABLE_DEMO_DATA` deve ficar `false` em produção.

## 3) Criar tabelas no MySQL da Hostinger
Executa `db/schema.mysql.sql` no phpMyAdmin ou SQL console.

## 4) Arrancar
```bash
npm run dev
```

## Rotas
- `/` landing
- `/login` login/registo
- `/dashboard` protegido
