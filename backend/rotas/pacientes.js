// Rotas de pacientes: listar, cadastrar, editar e excluir

const banco = require('../banco');
const { responder, lerCorpo, lerId, gravar } = require('../utilitarios');


// Deixa só os números
function somenteNumeros(valor) {
  return typeof valor === 'string' ? valor.replace(/\D/g, '') : '';
}

// Valida o CPF pelos dígitos verificadores
function cpfValido(cpf) {
  // 11 números, e não pode ser tudo igual
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // Calcula os dois últimos dígitos e compara
  for (let tamanho = 9; tamanho < 11; tamanho++) {
    let soma = 0;

    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }

    const digito = ((soma * 10) % 11) % 10;

    if (digito !== Number(cpf[tamanho])) {
      return false;
    }
  }

  return true;
}


// Retorna a mensagem de erro, ou null se estiver tudo certo
function validarPaciente(dados) {
  if (!Number.isInteger(dados.pessoa_id) || dados.pessoa_id < 1) {
    return 'Selecione a pessoa.';
  }

  if (!cpfValido(somenteNumeros(dados.cpf))) {
    return 'Informe um CPF válido.';
  }

  const telefone = somenteNumeros(dados.telefone);

  if (telefone.length < 10 || telefone.length > 11) {
    return 'Informe um telefone válido, com DDD.';
  }

  if (typeof dados.convenio !== 'string' || dados.convenio.trim() === '') {
    return 'Informe o convênio.';
  }

  if (dados.convenio.trim().length > 100) {
    return 'O convênio deve ter no máximo 100 caracteres.';
  }

  return null;
}

// Troca os erros do MySQL por mensagens para a tela
// (1062 = valor repetido, 1452 = registro não existe)
function traduzirErroDoBanco(erro) {
  if (erro.codigo === 1062 && erro.message.includes('uk_pacientes_cpf')) {
    return 'Este CPF já está cadastrado.';
  }

  if (erro.codigo === 1062 && erro.message.includes('uk_pacientes_pessoa')) {
    return 'Esta pessoa já está cadastrada como paciente.';
  }

  if (erro.codigo === 1452) {
    return 'Pessoa não encontrada.';
  }

  return null;
}

// Valores na ordem do INSERT e do UPDATE
function valoresDoPaciente(dados) {
  return [
    dados.pessoa_id,
    somenteNumeros(dados.cpf),
    somenteNumeros(dados.telefone),
    dados.convenio.trim()
  ];
}


// Lista os pacientes com o nome da pessoa
async function listar(res) {
  const pacientes = await banco.consultar(`
    SELECT pa.id, pa.pessoa_id, p.nome AS pessoa_nome, pa.cpf, pa.telefone, pa.convenio,
           pa.data_criacao, pa.data_modificacao
      FROM pacientes pa
      JOIN pessoas p ON p.id = pa.pessoa_id
     ORDER BY p.nome
  `);

  responder(res, 200, pacientes);
}

// Cadastra um paciente
async function cadastrar(req, res) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarPaciente(dados);

  if (erro) {
    return responder(res, 400, { erro });
  }

  const resultado = await gravar(
    res,
    'INSERT INTO pacientes (pessoa_id, cpf, telefone, convenio) VALUES (?, ?, ?, ?)',
    valoresDoPaciente(dados),
    traduzirErroDoBanco
  );

  if (resultado) {
    responder(res, 201, { id: resultado.idInserido });
  }
}

// Edita um paciente
async function editar(req, res, id) {
  const dados = await lerCorpo(req);

  if (!dados) {
    return responder(res, 400, { erro: 'Dados inválidos.' });
  }

  const erro = validarPaciente(dados);

  if (erro) {
    return responder(res, 400, { erro });
  }

  // Confere se o paciente existe
  const encontrados = await banco.consultar('SELECT id FROM pacientes WHERE id = ?', [id]);

  if (encontrados.length === 0) {
    return responder(res, 404, { erro: 'Paciente não encontrado.' });
  }

  const resultado = await gravar(
    res,
    'UPDATE pacientes SET pessoa_id = ?, cpf = ?, telefone = ?, convenio = ? WHERE id = ?',
    [...valoresDoPaciente(dados), id],
    traduzirErroDoBanco
  );

  if (resultado) {
    responder(res, 204);
  }
}

// Exclui o paciente (a pessoa continua cadastrada)
async function excluir(res, id) {
  const resultado = await banco.executar('DELETE FROM pacientes WHERE id = ?', [id]);

  if (resultado.linhasAfetadas === 0) {
    return responder(res, 404, { erro: 'Paciente não encontrado.' });
  }

  responder(res, 204);
}


// Escolhe a ação pelo método e pelo id da URL
async function rotasPacientes(req, res, textoId) {
  // Sem id: /api/pacientes
  if (textoId === undefined) {
    if (req.method === 'GET') return listar(res);
    if (req.method === 'POST') return cadastrar(req, res);
  }

  // Com id: /api/pacientes/5
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


module.exports = rotasPacientes;
