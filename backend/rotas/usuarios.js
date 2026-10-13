/* ==========================================================
   HOSPITAL JOHN KNOX — ROTAS DE USUÁRIOS (CRUD completo)
        GET    /api/usuarios      → lista todos os usuários
        POST   /api/usuarios      → cadastra um usuário
        PUT    /api/usuarios/:id  → altera um usuário
        DELETE /api/usuarios/:id  → exclui um usuário
   A senha nunca é devolvida pela API.
   ========================================================== */

const crypto = require('crypto');
const express = require('express');
const banco = require('../banco');

const rotas = express.Router();

const TIPOS_DE_USUARIO = ['admin', 'medico'];


/* ===== SENHA =====
   Guarda a senha criptografada com scrypt (já vem no Node).
   Formato salvo no banco: "sal:hash". O sal aleatório faz com que
   duas senhas iguais gerem textos diferentes. */
function criptografarSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, sal, 64).toString('hex');
  return `${sal}:${hash}`;
}


/* ===== VALIDAÇÃO =====
   Retorna uma mensagem de erro ou null se estiver tudo certo.
   Na edição a senha é opcional: em branco, mantém a atual. */
function validarUsuario(dados, editando) {
  const { pessoa_id, login, senha, tipo_usuario } = dados;

  if (!Number.isInteger(pessoa_id) || pessoa_id < 1) {
    return 'Selecione a pessoa.';
  }

  if (typeof login !== 'string' || !/^[a-zA-Z0-9._-]{3,50}$/.test(login.trim())) {
    return 'O login deve ter de 3 a 50 caracteres, sem espaços (letras, números, ponto, hífen ou _).';
  }

  const senhaInformada = typeof senha === 'string' && senha !== '';

  if (!editando && !senhaInformada) {
    return 'Informe a senha.';
  }

  if (senhaInformada && (senha.length < 6 || senha.length > 100)) {
    return 'A senha deve ter de 6 a 100 caracteres.';
  }

  if (!TIPOS_DE_USUARIO.includes(tipo_usuario)) {
    return 'Selecione o tipo de usuário.';
  }

  return null;
}

// Converte erros do MySQL em mensagens claras para a tela.
// Retorna null se for um erro inesperado.
function traduzirErroDoBanco(erro) {
  if (erro.code === 'ER_DUP_ENTRY' && erro.message.includes('uk_usuarios_login')) {
    return 'Este login já está em uso.';
  }

  if (erro.code === 'ER_DUP_ENTRY' && erro.message.includes('uk_usuarios_pessoa')) {
    return 'Esta pessoa já tem um usuário.';
  }

  if (erro.code === 'ER_NO_REFERENCED_ROW_2') {
    return 'Pessoa não encontrada.';
  }

  return null;
}

// Lê o id da URL; retorna null se não for um número válido
function lerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}


/* ===== ROTAS ===== */

// Lista os usuários junto com o nome da pessoa (sem a senha)
rotas.get('/', async (req, res) => {
  const [usuarios] = await banco.execute(`
    SELECT u.id, u.pessoa_id, p.nome AS pessoa_nome, u.login, u.tipo_usuario,
           u.data_criacao, u.data_modificacao
      FROM usuarios u
      JOIN pessoas p ON p.id = u.pessoa_id
     ORDER BY u.login
  `);

  res.json(usuarios);
});

// Cadastra um novo usuário
rotas.post('/', async (req, res) => {
  const erro = validarUsuario(req.body, false);

  if (erro) {
    return res.status(400).json({ erro });
  }

  const { pessoa_id, login, senha, tipo_usuario } = req.body;

  try {
    const [resultado] = await banco.execute(
      'INSERT INTO usuarios (pessoa_id, login, senha, tipo_usuario) VALUES (?, ?, ?, ?)',
      [pessoa_id, login.trim(), criptografarSenha(senha), tipo_usuario]
    );

    res.status(201).json({ id: resultado.insertId });
  } catch (erroBanco) {
    const mensagem = traduzirErroDoBanco(erroBanco);

    if (!mensagem) {
      throw erroBanco; // erro inesperado: vai para o tratamento geral
    }

    res.status(400).json({ erro: mensagem });
  }
});

// Altera um usuário. Se a senha vier em branco, a atual é mantida.
rotas.put('/:id', async (req, res) => {
  const id = lerId(req);

  if (!id) {
    return res.status(400).json({ erro: 'Id inválido.' });
  }

  const erro = validarUsuario(req.body, true);

  if (erro) {
    return res.status(400).json({ erro });
  }

  const { pessoa_id, login, senha, tipo_usuario } = req.body;

  // Monta o UPDATE incluindo a senha só quando ela foi informada
  let sql = 'UPDATE usuarios SET pessoa_id = ?, login = ?, tipo_usuario = ?';
  const valores = [pessoa_id, login.trim(), tipo_usuario];

  if (typeof senha === 'string' && senha !== '') {
    sql += ', senha = ?';
    valores.push(criptografarSenha(senha));
  }

  sql += ' WHERE id = ?';
  valores.push(id);

  try {
    const [resultado] = await banco.execute(sql, valores);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    res.status(204).end();
  } catch (erroBanco) {
    const mensagem = traduzirErroDoBanco(erroBanco);

    if (!mensagem) {
      throw erroBanco;
    }

    res.status(400).json({ erro: mensagem });
  }
});

// Exclui um usuário (a pessoa continua cadastrada)
rotas.delete('/:id', async (req, res) => {
  const id = lerId(req);

  if (!id) {
    return res.status(400).json({ erro: 'Id inválido.' });
  }

  const [resultado] = await banco.execute('DELETE FROM usuarios WHERE id = ?', [id]);

  if (resultado.affectedRows === 0) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  res.status(204).end();
});


module.exports = rotas;
