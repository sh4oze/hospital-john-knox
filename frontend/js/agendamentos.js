// Tela de agendamentos: listar, cadastrar, editar e excluir

// Endereços da API
const API_AGENDAMENTOS = '/api/agendamentos';
const API_PACIENTES = '/api/pacientes';
const API_USUARIOS = '/api/usuarios';

// Nome de cada status na tela
const NOMES_DOS_STATUS = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado'
};

// Elementos da página
const formulario = document.getElementById('form-agendamento');
const tituloFormulario = document.getElementById('titulo-formulario');
const textoFormulario = document.getElementById('texto-formulario');
const selectPaciente = document.getElementById('select-paciente');
const selectMedico = document.getElementById('select-medico');
const campoDataHora = formulario.elements.data_hora;
const campoStatus = document.getElementById('campo-status');
const botaoSalvar = document.getElementById('botao-salvar');
const botaoCancelar = document.getElementById('botao-cancelar');
const contador = document.getElementById('contador');
const tabela = document.getElementById('tabela-agendamentos');
const lista = document.getElementById('lista-agendamentos');
const listaVazia = document.getElementById('lista-vazia');

// Id em edição (null quando está cadastrando)
let idEmEdicao = null;


// Data e hora de agora, para não deixar agendar no passado
function agora() {
  const data = new Date();
  const doisDigitos = function (numero) {
    return String(numero).padStart(2, '0');
  };

  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
    + `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}


// Preenche as listas de pacientes e médicos
async function carregarPacientes() {
  const pacientes = await buscarLista(API_PACIENTES);

  preencherSelect(selectPaciente, pacientes, 'Selecione o paciente', 'Cadastre um paciente primeiro', function (paciente) {
    return paciente.pessoa_nome;
  });
}

// Médicos são os usuários do tipo "medico"
async function carregarMedicos() {
  const usuarios = await buscarLista(API_USUARIOS);

  const medicos = usuarios.filter(function (usuario) {
    return usuario.tipo_usuario === 'medico';
  });

  preencherSelect(selectMedico, medicos, 'Selecione o médico', 'Cadastre um usuário médico primeiro', function (medico) {
    return medico.pessoa_nome;
  });
}


// Lista de agendamentos
async function carregarAgendamentos() {
  mostrarAgendamentos(await buscarLista(API_AGENDAMENTOS));
}

// Monta a tabela
function mostrarAgendamentos(agendamentos) {
  lista.innerHTML = '';
  contador.textContent = agendamentos.length;

  // Sem registros, mostra o aviso no lugar da tabela
  tabela.hidden = agendamentos.length === 0;
  listaVazia.hidden = agendamentos.length > 0;

  agendamentos.forEach(function (agendamento) {
    const linha = document.createElement('tr');

    // Destaca a linha em edição
    if (agendamento.id === idEmEdicao) {
      linha.className = 'em-edicao';
    }

    linha.append(
      criarCelula(agendamento.paciente_nome, `Médico: ${agendamento.medico_nome}`),
      criarCelula(formatarData(agendamento.data_hora), agendamento.data_hora.slice(11, 16)),
      criarCelulaStatus(agendamento.status),
      criarCelulaAcoes([
        criarBotao('Editar', 'botao-editar', function () {
          iniciarEdicao(agendamento);
        }),
        criarBotao('Excluir', 'botao-excluir', function () {
          excluirAgendamento(agendamento);
        })
      ])
    );

    lista.append(linha);
  });
}

// Célula com a etiqueta do status
function criarCelulaStatus(status) {
  const celula = document.createElement('td');
  const etiqueta = document.createElement('span');

  etiqueta.className = `etiqueta etiqueta-${status}`;
  etiqueta.textContent = NOMES_DOS_STATUS[status];
  celula.append(etiqueta);

  return celula;
}

// Recarrega a lista
async function atualizarLista() {
  try {
    await carregarAgendamentos();
  } catch {
    mostrarMensagem('Não foi possível carregar os agendamentos. Verifique se o servidor está ligado.', 'erro');
  }
}


// Abre o registro no formulário para editar
function iniciarEdicao(agendamento) {
  idEmEdicao = agendamento.id;

  formulario.elements.paciente_id.value = agendamento.paciente_id;
  formulario.elements.medico_id.value = agendamento.medico_id;
  formulario.elements.status.value = agendamento.status;

  // Na edição pode ser data passada (para marcar como realizada)
  campoDataHora.min = '';
  campoDataHora.value = agendamento.data_hora.replace(' ', 'T');

  campoStatus.hidden = false;

  tituloFormulario.textContent = 'Editar agendamento';
  textoFormulario.textContent = 'Altere os dados ou o status e salve.';
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelar.hidden = false;

  formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
  atualizarLista(); // destaca a linha
}

// Volta o formulário ao modo de cadastro
function encerrarEdicao() {
  idEmEdicao = null;
  formulario.reset();

  campoDataHora.min = agora();
  campoStatus.hidden = true;

  tituloFormulario.textContent = 'Novo agendamento';
  textoFormulario.textContent = 'Marque uma consulta para um paciente.';
  botaoSalvar.textContent = 'Agendar';
  botaoCancelar.hidden = true;
}

botaoCancelar.addEventListener('click', function () {
  encerrarEdicao();
  atualizarLista();
});


// Salvar (cadastro ou edição)
formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault(); // não recarrega a página

  const editando = idEmEdicao !== null;

  const dados = {
    paciente_id: Number(formulario.elements.paciente_id.value),
    medico_id: Number(formulario.elements.medico_id.value),
    data_hora: campoDataHora.value
  };

  // Status só na edição
  if (editando) {
    dados.status = formulario.elements.status.value;
  }

  // POST para cadastrar, PUT para editar
  const endereco = editando ? `${API_AGENDAMENTOS}/${idEmEdicao}` : API_AGENDAMENTOS;
  const metodo = editando ? 'PUT' : 'POST';

  // Evita clique duplo
  botaoSalvar.disabled = true;

  try {
    const resposta = await fetch(endereco, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
      return;
    }

    encerrarEdicao();
    mostrarMensagem(editando ? 'Agendamento atualizado.' : 'Consulta agendada com sucesso.', 'sucesso');
    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  } finally {
    botaoSalvar.disabled = false;
  }
});


// Exclui o agendamento depois de confirmar
async function excluirAgendamento(agendamento) {
  const confirmou = confirm(
    `Excluir o agendamento de ${agendamento.paciente_nome} em ${formatarDataHora(agendamento.data_hora)}?\n`
    + 'Para manter o registro, edite e marque como "Cancelado".'
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_AGENDAMENTOS}/${agendamento.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
    } else {
      // Se estava em edição, limpa o formulário
      if (agendamento.id === idEmEdicao) {
        encerrarEdicao();
      }

      mostrarMensagem('Agendamento excluído.', 'sucesso');
    }

    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  }
}


// Início
campoDataHora.min = agora();

Promise.all([carregarPacientes(), carregarMedicos(), carregarAgendamentos()]).catch(function () {
  mostrarMensagem('Não foi possível carregar os dados. Verifique se o servidor está ligado.', 'erro');
});
