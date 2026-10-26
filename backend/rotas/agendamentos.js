// Rotas de agendamentos: listar, cadastrar, editar e excluir

const banco = require('../banco');
const { responder, lerCorpo, lerId, gravar } = require('../utilitarios');

const STATUS_VALIDOS = ['agendado', 'realizado', 'cancelado'];


// Converte a data do campo da página para o formato do MySQL.
// Retorna null se a data ou a hora forem inválidas.
function lerDataHora(texto) {
  const partes = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(typeof texto === 'string' ? texto : '');

  if (!partes) {
    return null;
  }

  const [, data, hora, minuto] = partes;

  // Não aceita datas que não existem, como 31/02
  const dia = new Date(data + 'T00:00:00Z');
  const dataValida = !isNaN(dia) && dia.toISOString().slice(0, 10) === data;

  if (!dataValida || Number(hora) > 23 || Number(minuto) > 59) {
    return null;
  }

  return `${data} ${hora}:${minuto}:00`;
}

// Verifica se o horário já passou
function estaNoPassado(dataHora) {
  return new Date(dataHora.replace(' ', 'T')) < new Date();
}


// Retorna a mensagem de erro, ou null se estiver tudo certo.
// O status só é conferido na edição (no cadastro é sempre "agendado").
function validarAgendamento(dados, editando) {
  if (!Number.isInteger(dados.paciente_id) || dados.paciente_id < 1) {
    return 'Selecione o paciente.';
  }

  if (!Number.isInteger(dados.medico_id) || dados.medico_id < 1) {
    return 'Selecione o médico.';
  }

  const dataHora = lerDataHora(dados.data_hora);

  if (!dataHora) {
    return 'Informe uma data e um horário válidos.';
  }

  if (!editando && estaNoPassado(dataHora)) {
    return 'O agendamento precisa ser para uma data e um horário futuros.';
  }

  if (editando && !STATUS_VALIDOS.includes(dados.status)) {
    return 'Selecione o status.';
  }

  return null;
}

// Regras que dependem do banco. idAtual é o agendamento em edição (0 no cadastro).
async function conferirRegras(dados, dataHora, status, idAtual) {
  // O usuário escolhido precisa ser médico
  const medicos = await banco.consultar('SELECT tipo_usuario FROM usuarios WHERE id = ?', [dados.medico_id]);

  if (medicos.length === 0) {
    return 'Médico não encontrado.';
  }

  if (medicos[0].tipo_usuario !== 'medico') {
    return 'O usuário escolhido não é médico.';
  }

  // Agendamento cancelado não ocupa horário
  if (status === 'cancelado') {
    return null;
  }

  // Médico e paciente não podem ter duas consultas no mesmo horário
  const conflitos = await banco.consultar(`
    SELECT medico_id, paciente_id
      FROM agendamentos
     WHERE data_hora = ?
       AND status <> 'cancelado'
       AND id <> ?
       AND (medico_id = ? OR paciente_id = ?)
  `, [dataHora, idAtual, dados.medico_id, dados.paciente_id]);

  if (conflitos.some(function (c) { return c.medico_id === dados.medico_id; })) {
    return 'Este médico já tem um agendamento neste horário.';
  }

  if (conflitos.length > 0) {
    return 'Este paciente já tem um agendamento neste horário.';
  }

  return null;
}

// Troca os erros do MySQL por mensagens para a tela (1452 = registro não existe)
function traduzirErroDoBanco(erro) {
  if (erro.codigo === 1452 && erro.message.includes('fk_agendamentos_paciente')) {
    return 'Paciente não encontrado.';
  }

  if (erro.codigo === 1452) {
    return 'Médico não encontrado.';
  }

  return null;
}


// Lista por data, com os nomes do paciente e do médico
async function listar(res) {
  const agendamentos = await banco.consultar(`
    SELECT a.id,
           a.paciente_id, pessoa_paciente.nome AS paciente_nome,
           a.medico_id,   pessoa_medico.nome   AS medico_nome,
           DATE_FORMAT(a.data_hora, '%Y-%m-%d %H:%i') AS data_hora,
           a.status, a.data_criacao, a.data_modificacao
      FROM agendamentos a
      JOIN pacientes pa                ON pa.id = a.paciente_id
      JOIN pessoas   pessoa_paciente   ON pessoa_paciente.id = pa.pessoa_id
      JOIN usuarios  u                 ON u.id = a.medico_id
      JOIN pessoas   pessoa_medico     ON pessoa_medico.id = u.pessoa_id
     ORDER BY a.data_hora
  `);

  responder(res, 200, agendamentos);
}

// Cadastra um agendamento (começa como "agendado")
async function cadastrar(req, res) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarAgendamento(dados, false);

  if (erro) {
    return responder(res, 400, { erro });
  }

  const dataHora = lerDataHora(dados.data_hora);
  const erroDeRegra = await conferirRegras(dados, dataHora, 'agendado', 0);

  if (erroDeRegra) {
    return responder(res, 400, { erro: erroDeRegra });
  }

  const resultado = await gravar(
    res,
    'INSERT INTO agendamentos (paciente_id, medico_id, data_hora) VALUES (?, ?, ?)',
    [dados.paciente_id, dados.medico_id, dataHora],
    traduzirErroDoBanco
  );

  if (resultado) {
    responder(res, 201, { id: resultado.idInserido });
  }
}

// Edita um agendamento
async function editar(req, res, id) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarAgendamento(dados, true);

  if (erro) {
    return responder(res, 400, { erro });
  }

  // Confere se o agendamento existe
  const encontrados = await banco.consultar('SELECT id FROM agendamentos WHERE id = ?', [id]);

  if (encontrados.length === 0) {
    return responder(res, 404, { erro: 'Agendamento não encontrado.' });
  }

  const dataHora = lerDataHora(dados.data_hora);
  const erroDeRegra = await conferirRegras(dados, dataHora, dados.status, id);

  if (erroDeRegra) {
    return responder(res, 400, { erro: erroDeRegra });
  }

  const resultado = await gravar(
    res,
    'UPDATE agendamentos SET paciente_id = ?, medico_id = ?, data_hora = ?, status = ? WHERE id = ?',
    [dados.paciente_id, dados.medico_id, dataHora, dados.status, id],
    traduzirErroDoBanco
  );

  if (resultado) {
    responder(res, 204);
  }
}

// Exclui um agendamento
async function excluir(res, id) {
  const resultado = await banco.executar('DELETE FROM agendamentos WHERE id = ?', [id]);

  if (resultado.linhasAfetadas === 0) {
    return responder(res, 404, { erro: 'Agendamento não encontrado.' });
  }

  responder(res, 204);
}


// Escolhe a ação pelo método e pelo id da URL
async function rotasAgendamentos(req, res, textoId) {
  // Sem id: /api/agendamentos
  if (textoId === undefined) {
    if (req.method === 'GET') return listar(res);
    if (req.method === 'POST') return cadastrar(req, res);
  }

  // Com id: /api/agendamentos/5
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


module.exports = rotasAgendamentos;
