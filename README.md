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
```

`AUTH_SECRET` pode ser uma string longa aleatória.

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
