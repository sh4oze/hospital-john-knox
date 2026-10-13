/* ==========================================================
   HOSPITAL JOHN KNOX — CONEXÃO COM O MYSQL
   Os dados de acesso vêm do arquivo .env
   ========================================================== */

const mysql = require('mysql2/promise');

// "Pool" mantém algumas conexões abertas e reaproveita entre as requisições
const banco = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORTA),
  user: process.env.DB_USUARIO,
  password: process.env.DB_SENHA,
  database: process.env.DB_NOME,

  // Devolve datas como texto ("1990-05-12"), evitando erros de fuso horário
  dateStrings: true
});

module.exports = banco;
