/* ==========================================================
   HOSPITAL JOHN KNOX — ROTAS DE PESSOAS
        GET    /api/pessoas      → lista todas as pessoas
        POST   /api/pessoas      → cadastra uma pessoa
        DELETE /api/pessoas/:id  → exclui uma pessoa
   ========================================================== */

const express = require('express');
const banco = require('../banco');

const rotas = express.Router();


/* ===== VALIDAÇÃO =====
   Confere os dados enviados antes de gravar no banco.
   Retorna uma mensagem de erro ou null se estiver tudo certo. */
function validarPessoa(nome, nascimento) {
  if (typeof nome !== 'string' || nome.trim() === '') {
    return 'Informe o nome.';
  }

  if (nome.trim().length > 150) {
    return 'O nome deve ter no máximo 150 caracteres.';
  }

  // A data precisa existir de verdade (ex.: 31/02 é inválido)
  const data = new Date(nascimento + 'T00:00:00Z');
  const dataValida = !isNaN(data) && data.toISOString().slice(0, 10) === nascimento;

  if (!dataValida) {
    return 'Informe uma data de nascimento válida.';
  }

  if (data > new Date()) {
    return 'A data de nascimento não pode estar no futuro.';
  }

  return null;
}


/* ===== ROTAS ===== */

// Lista todas as pessoas, em ordem alfabética
rotas.get('/', async (req, res) => {
  const [pessoas] = await banco.execute(
    'SELECT id, nome, nascimento, data_criacao, data_modificacao FROM pessoas ORDER BY nome'
  );

  res.json(pessoas);
});

// Cadastra uma nova pessoa
rotas.post('/', async (req, res) => {
  const { nome, nascimento } = req.body;
  const erro = validarPessoa(nome, nascimento);

  if (erro) {
    return res.status(400).json({ erro });
  }

  const [resultado] = await banco.execute(
    'INSERT INTO pessoas (nome, nascimento) VALUES (?, ?)',
    [nome.trim(), nascimento]
  );

  res.status(201).json({ id: resultado.insertId });
});

// Exclui uma pessoa pelo id (o usuário dela, se houver, é excluído junto)
rotas.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'Id inválido.' });
  }

  const [resultado] = await banco.execute('DELETE FROM pessoas WHERE id = ?', [id]);

  if (resultado.affectedRows === 0) {
    return res.status(404).json({ erro: 'Pessoa não encontrada.' });
  }

  res.status(204).end();
});


module.exports = rotas;
