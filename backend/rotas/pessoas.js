// Rotas de pessoas: listar, cadastrar, editar e excluir

const banco = require('../banco');
const { responder, lerCorpo, lerId } = require('../utilitarios');


// Retorna a mensagem de erro, ou null se estiver tudo certo
function validarPessoa(nome, nascimento) {
  if (typeof nome !== 'string' || nome.trim() === '') {
    return 'Informe o nome.';
  }

  if (nome.trim().length > 150) {
    return 'O nome deve ter no máximo 150 caracteres.';
  }

  // Não aceita datas que não existem, como 31/02
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


// Lista em ordem alfabética
async function listar(res) {
  const pessoas = await banco.consultar(
    'SELECT id, nome, nascimento, data_criacao, data_modificacao FROM pessoas ORDER BY nome'
  );

  responder(res, 200, pessoas);
}

// Cadastra uma pessoa
async function cadastrar(req, res) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarPessoa(dados.nome, dados.nascimento);

  if (erro) {
    return responder(res, 400, { erro });
  }

  const resultado = await banco.executar(
    'INSERT INTO pessoas (nome, nascimento) VALUES (?, ?)',
    [dados.nome.trim(), dados.nascimento]
  );

  responder(res, 201, { id: resultado.idInserido });
}

// Edita uma pessoa
async function editar(req, res, id) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarPessoa(dados.nome, dados.nascimento);

  if (erro) {
    return responder(res, 400, { erro });
  }

  // Confere se a pessoa existe
  const encontradas = await banco.consultar('SELECT id FROM pessoas WHERE id = ?', [id]);

  if (encontradas.length === 0) {
    return responder(res, 404, { erro: 'Pessoa não encontrada.' });
  }

  await banco.executar(
    'UPDATE pessoas SET nome = ?, nascimento = ? WHERE id = ?',
    [dados.nome.trim(), dados.nascimento, id]
  );

  responder(res, 204);
}

// Exclui a pessoa (o banco apaga junto o usuário, o paciente e os agendamentos dela)
async function excluir(res, id) {
  const resultado = await banco.executar('DELETE FROM pessoas WHERE id = ?', [id]);

  if (resultado.linhasAfetadas === 0) {
    return responder(res, 404, { erro: 'Pessoa não encontrada.' });
  }

  responder(res, 204);
}


// Escolhe a ação pelo método e pelo id da URL
async function rotasPessoas(req, res, textoId) {
  // Sem id: /api/pessoas
  if (textoId === undefined) {
    if (req.method === 'GET') return listar(res);
    if (req.method === 'POST') return cadastrar(req, res);
  }

  // Com id: /api/pessoas/5
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


module.exports = rotasPessoas;
