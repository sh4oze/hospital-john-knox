/* ==========================================================
   HOSPITAL JOHN KNOX — SERVIDOR (Back-end)
   1. Entrega as páginas da pasta "frontend"
   2. Oferece a API, que lê e grava no MySQL:
        /api/pessoas   → rotas/pessoas.js
        /api/usuarios  → rotas/usuarios.js
   ========================================================== */

const path = require('path');
const express = require('express');
const banco = require('./banco');
const rotasPessoas = require('./rotas/pessoas');
const rotasUsuarios = require('./rotas/usuarios');

const app = express();
const PORTA = process.env.PORTA || 3000;

// Permite ler o corpo das requisições em formato JSON
app.use(express.json());

// Entrega os arquivos do front-end (HTML, CSS e JS)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rotas da API
app.use('/api/pessoas', rotasPessoas);
app.use('/api/usuarios', rotasUsuarios);


/* ===== TRATAMENTO DE ERROS =====
   Qualquer erro inesperado (ex.: banco fora do ar) cai aqui. */
app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});


/* ===== INÍCIO =====
   Testa a conexão com o banco antes de ligar o servidor. */
banco.query('SELECT 1')
  .then(() => {
    app.listen(PORTA, () => {
      console.log(`Servidor rodando em http://localhost:${PORTA}`);
    });
  })
  .catch((erro) => {
    console.error('Não foi possível conectar ao MySQL:', erro.message);
    process.exit(1);
  });
