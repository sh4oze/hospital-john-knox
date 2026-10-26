// Tela de pacientes: listar, cadastrar, editar e excluir

// Endereços da API
const API_PACIENTES = '/api/pacientes';
const API_PESSOAS = '/api/pessoas';

// Elementos da página
const formulario = document.getElementById('form-paciente');
const tituloFormulario = document.getElementById('titulo-formulario');
const textoFormulario = document.getElementById('texto-formulario');
const selectPessoa = document.getElementById('select-pessoa');
const botaoSalvar = document.getElementById('botao-salvar');
const botaoCancelar = document.getElementById('botao-cancelar');
const contador = document.getElementById('contador');
const tabela = document.getElementById('tabela-pacientes');
const lista = document.getElementById('lista-pacientes');
const listaVazia = document.getElementById('lista-vazia');

// Id em edição (null quando está cadastrando)
let idEmEdicao = null;


// No banco ficam só os números; na tela, com pontuação

// Formata o CPF: 123.456.789-09
function formatarCpf(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);

  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Formata o telefone: (11) 92345-6789 ou (11) 2345-6789
function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) {
    return numeros;
  }

  const ddd = numeros.slice(0, 2);
  const numero = numeros.slice(2);

  // Celular tem 9 números e fixo tem 8
  const corte = numero.length === 9 ? 5 : 4;

  if (numero.length <= corte) {
    return `(${ddd}) ${numero}`;
  }

  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

// Formata enquanto digita
formulario.elements.cpf.addEventListener('input', function () {
  this.value = formatarCpf(this.value);
});

formulario.elements.telefone.addEventListener('input', function () {
  this.value = formatarTelefone(this.value);
});


// Preenche a lista de pessoas
async function carregarPessoas() {
  const pessoas = await buscarLista(API_PESSOAS);

  preencherSelect(selectPessoa, pessoas, 'Selecione uma pessoa', 'Cadastre uma pessoa primeiro', function (pessoa) {
    return pessoa.nome;
  });
}


// Lista de pacientes
async function carregarPacientes() {
  mostrarPacientes(await buscarLista(API_PACIENTES));
}

// Monta a tabela
function mostrarPacientes(pacientes) {
  lista.innerHTML = '';
  contador.textContent = pacientes.length;

  // Sem registros, mostra o aviso no lugar da tabela
  tabela.hidden = pacientes.length === 0;
  listaVazia.hidden = pacientes.length > 0;

  pacientes.forEach(function (paciente) {
    const linha = document.createElement('tr');

    // Destaca a linha em edição
    if (paciente.id === idEmEdicao) {
      linha.className = 'em-edicao';
    }

    linha.append(
      criarCelula(paciente.pessoa_nome, `CPF ${formatarCpf(paciente.cpf)}`),
      criarCelula(formatarTelefone(paciente.telefone), paciente.convenio),
      criarCelulaAcoes([
        criarBotao('Editar', 'botao-editar', function () {
          iniciarEdicao(paciente);
        }),
        criarBotao('Excluir', 'botao-excluir', function () {
          excluirPaciente(paciente);
        })
      ])
    );

    lista.append(linha);
  });
}

// Recarrega a lista
async function atualizarLista() {
  try {
    await carregarPacientes();
  } catch {
    mostrarMensagem('Não foi possível carregar os pacientes. Verifique se o servidor está ligado.', 'erro');
  }
}


// Abre o registro no formulário para editar
function iniciarEdicao(paciente) {
  idEmEdicao = paciente.id;

  formulario.elements.pessoa_id.value = paciente.pessoa_id;
  formulario.elements.cpf.value = formatarCpf(paciente.cpf);
  formulario.elements.telefone.value = formatarTelefone(paciente.telefone);
  formulario.elements.convenio.value = paciente.convenio;

  tituloFormulario.textContent = 'Editar paciente';
  textoFormulario.textContent = 'Altere os dados e salve.';
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelar.hidden = false;

  formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
  formulario.elements.cpf.focus();
  atualizarLista(); // destaca a linha
}

// Volta o formulário ao modo de cadastro
function encerrarEdicao() {
  idEmEdicao = null;
  formulario.reset();

  tituloFormulario.textContent = 'Cadastro de paciente';
  textoFormulario.textContent = 'Escolha a pessoa e complete os dados do paciente.';
  botaoSalvar.textContent = 'Cadastrar';
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

  // O servidor tira a pontuação do CPF e do telefone
  const dados = {
    pessoa_id: Number(formulario.elements.pessoa_id.value),
    cpf: formulario.elements.cpf.value,
    telefone: formulario.elements.telefone.value,
    convenio: formulario.elements.convenio.value
  };

  // POST para cadastrar, PUT para editar
  const endereco = editando ? `${API_PACIENTES}/${idEmEdicao}` : API_PACIENTES;
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
    mostrarMensagem(editando ? 'Paciente atualizado.' : 'Paciente cadastrado com sucesso.', 'sucesso');
    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  } finally {
    botaoSalvar.disabled = false;
  }
});


// Exclui o paciente depois de confirmar
async function excluirPaciente(paciente) {
  const confirmou = confirm(
    `Excluir o paciente ${paciente.pessoa_nome}?\nA pessoa continua cadastrada, mas os agendamentos dele também serão excluídos.`
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_PACIENTES}/${paciente.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
    } else {
      // Se estava em edição, limpa o formulário
      if (paciente.id === idEmEdicao) {
        encerrarEdicao();
      }

      mostrarMensagem(`Paciente ${paciente.pessoa_nome} excluído.`, 'sucesso');
    }

    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  }
}


// Início
Promise.all([carregarPessoas(), carregarPacientes()]).catch(function () {
  mostrarMensagem('Não foi possível carregar os dados. Verifique se o servidor está ligado.', 'erro');
});
