import mysql, { Pool } from "mysql2/promise";

let pool: Pool | null = null;

export function hasDatabaseConfig() {
  return Boolean(
    process.env.MYSQL_HOST &&
      process.env.MYSQL_DATABASE &&
      process.env.MYSQL_USER &&
      process.env.MYSQL_PASSWORD
  );
}

export function getDb() {
  if (!hasDatabaseConfig()) {
    throw new Error("Missing MySQL environment variables.");
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  return pool;
}
