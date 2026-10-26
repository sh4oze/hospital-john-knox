// Rotas de usuários: listar, cadastrar, editar e excluir.
// A senha nunca é devolvida pela API.

const crypto = require('crypto');
const banco = require('../banco');
const { responder, lerCorpo, lerId, gravar } = require('../utilitarios');

const TIPOS_DE_USUARIO = ['admin', 'medico'];


// Criptografa a senha com scrypt. No banco fica "sal:hash".
function criptografarSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, sal, 64).toString('hex');
  return `${sal}:${hash}`;
}

// Na edição a senha pode vir em branco
function senhaFoiInformada(senha) {
  return typeof senha === 'string' && senha !== '';
}


// Retorna a mensagem de erro, ou null se estiver tudo certo.
// Na edição, senha em branco mantém a atual.
function validarUsuario(dados, editando) {
  const { pessoa_id, login, senha, tipo_usuario } = dados;

  if (!Number.isInteger(pessoa_id) || pessoa_id < 1) {
    return 'Selecione a pessoa.';
  }

  if (typeof login !== 'string' || !/^[a-zA-Z0-9._-]{3,50}$/.test(login.trim())) {
    return 'O login deve ter de 3 a 50 caracteres, sem espaços (letras, números, ponto, hífen ou _).';
  }

  if (!editando && !senhaFoiInformada(senha)) {
    return 'Informe a senha.';
  }

  if (senhaFoiInformada(senha) && (senha.length < 6 || senha.length > 100)) {
    return 'A senha deve ter de 6 a 100 caracteres.';
  }

  if (!TIPOS_DE_USUARIO.includes(tipo_usuario)) {
    return 'Selecione o tipo de usuário.';
  }

  return null;
}

// Troca os erros do MySQL por mensagens para a tela
// (1062 = valor repetido, 1452 = registro não existe)
function traduzirErroDoBanco(erro) {
  if (erro.codigo === 1062 && erro.message.includes('uk_usuarios_login')) {
    return 'Este login já está em uso.';
  }

  if (erro.codigo === 1062 && erro.message.includes('uk_usuarios_pessoa')) {
    return 'Esta pessoa já tem um usuário.';
  }

  if (erro.codigo === 1452) {
    return 'Pessoa não encontrada.';
  }

  return null;
}


// Lista os usuários com o nome da pessoa (sem a senha)
async function listar(res) {
  const usuarios = await banco.consultar(`
    SELECT u.id, u.pessoa_id, p.nome AS pessoa_nome, u.login, u.tipo_usuario,
           u.data_criacao, u.data_modificacao
      FROM usuarios u
      JOIN pessoas p ON p.id = u.pessoa_id
     ORDER BY u.login
  `);

  responder(res, 200, usuarios);
}

// Cadastra um usuário
async function cadastrar(req, res) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarUsuario(dados, false);

  if (erro) {
    return responder(res, 400, { erro });
  }

  const resultado = await gravar(
    res,
    'INSERT INTO usuarios (pessoa_id, login, senha, tipo_usuario) VALUES (?, ?, ?, ?)',
    [dados.pessoa_id, dados.login.trim(), criptografarSenha(dados.senha), dados.tipo_usuario],
    traduzirErroDoBanco
  );

  if (resultado) {
    responder(res, 201, { id: resultado.idInserido });
  }
}

// Edita um usuário
async function editar(req, res, id) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarUsuario(dados, true);

  if (erro) {
    return responder(res, 400, { erro });
  }

  // Confere se o usuário existe
  const encontrados = await banco.consultar('SELECT id FROM usuarios WHERE id = ?', [id]);

  if (encontrados.length === 0) {
    return responder(res, 404, { erro: 'Usuário não encontrado.' });
  }

  // Médico com agendamentos não pode virar admin
  if (dados.tipo_usuario !== 'medico') {
    const consultas = await banco.consultar('SELECT id FROM agendamentos WHERE medico_id = ? LIMIT 1', [id]);

    if (consultas.length > 0) {
      return responder(res, 400, { erro: 'Este médico tem agendamentos. Exclua-os antes de mudar o tipo de usuário.' });
    }
  }

  // Só troca a senha se ela foi preenchida
  let sql = 'UPDATE usuarios SET pessoa_id = ?, login = ?, tipo_usuario = ?';
  const valores = [dados.pessoa_id, dados.login.trim(), dados.tipo_usuario];

  if (senhaFoiInformada(dados.senha)) {
    sql += ', senha = ?';
    valores.push(criptografarSenha(dados.senha));
  }

  sql += ' WHERE id = ?';
  valores.push(id);

  const resultado = await gravar(res, sql, valores, traduzirErroDoBanco);

  if (resultado) {
    responder(res, 204);
  }
}

// Exclui o usuário (a pessoa continua cadastrada)
async function excluir(res, id) {
  const resultado = await banco.executar('DELETE FROM usuarios WHERE id = ?', [id]);

  if (resultado.linhasAfetadas === 0) {
    return responder(res, 404, { erro: 'Usuário não encontrado.' });
  }

  responder(res, 204);
}


// Escolhe a ação pelo método e pelo id da URL
async function rotasUsuarios(req, res, textoId) {
  // Sem id: /api/usuarios
  if (textoId === undefined) {
    if (req.method === 'GET') return listar(res);
    if (req.method === 'POST') return cadastrar(req, res);
  }

  // Com id: /api/usuarios/5
  else {
    const id = lerId(textoId);

    if (!id) {
      return responder(res, 400, { erro: 'Id inválido.' });
    }

    if (req.method === 'PUT') return editar(req, res, id);
    if (req.method === 'DELETE') return excluir(res, id);
  }

  responder(res, 404, { erro: 'Rota não encontrada.' });
}


module.exports = rotasUsuarios;
