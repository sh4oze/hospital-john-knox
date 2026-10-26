// Tela de pessoas: listar, cadastrar, editar e excluir

// Endereço da API
const API_PESSOAS = '/api/pessoas';

// Elementos da página
const formulario = document.getElementById('form-pessoa');
const tituloFormulario = document.getElementById('titulo-formulario');
const textoFormulario = document.getElementById('texto-formulario');
const botaoSalvar = document.getElementById('botao-salvar');
const botaoCancelar = document.getElementById('botao-cancelar');
const contador = document.getElementById('contador');
const tabela = document.getElementById('tabela-pessoas');
const lista = document.getElementById('lista-pessoas');
const listaVazia = document.getElementById('lista-vazia');

// Id em edição (null quando está cadastrando)
let idEmEdicao = null;


// Calcula a idade pela data de nascimento
function calcularIdade(nascimento) {
  const [ano, mes, dia] = nascimento.split('-').map(Number);
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;

  let idade = agora.getFullYear() - ano;

  // Ainda não fez aniversário este ano
  if (mesAtual < mes || (mesAtual === mes && agora.getDate() < dia)) {
    idade--;
  }

  if (idade < 1) {
    return 'Menos de 1 ano';
  }

  return idade === 1 ? '1 ano' : `${idade} anos`;
}

// Data de hoje (AAAA-MM-DD), para não aceitar datas futuras
function hoje() {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}


// Lista de pessoas
async function carregarPessoas() {
  mostrarPessoas(await buscarLista(API_PESSOAS));
}

// Monta a tabela
function mostrarPessoas(pessoas) {
  lista.innerHTML = '';
  contador.textContent = pessoas.length;

  // Sem registros, mostra o aviso no lugar da tabela
  tabela.hidden = pessoas.length === 0;
  listaVazia.hidden = pessoas.length > 0;

  pessoas.forEach(function (pessoa) {
    const linha = document.createElement('tr');

    // Destaca a linha em edição
    if (pessoa.id === idEmEdicao) {
      linha.className = 'em-edicao';
    }

    linha.append(
      criarCelula(pessoa.nome, `Cadastrado em ${formatarData(pessoa.data_criacao)}`),
      criarCelula(formatarData(pessoa.nascimento), calcularIdade(pessoa.nascimento)),
      criarCelulaAcoes([
        criarBotao('Editar', 'botao-editar', function () {
          iniciarEdicao(pessoa);
        }),
        criarBotao('Excluir', 'botao-excluir', function () {
          excluirPessoa(pessoa);
        })
      ])
    );

    lista.append(linha);
  });
}

// Recarrega a lista
async function atualizarLista() {
  try {
    await carregarPessoas();
  } catch {
    mostrarMensagem('Não foi possível carregar as pessoas. Verifique se o servidor está ligado.', 'erro');
  }
}


// Abre o registro no formulário para editar
function iniciarEdicao(pessoa) {
  idEmEdicao = pessoa.id;

  formulario.elements.nome.value = pessoa.nome;
  formulario.elements.nascimento.value = pessoa.nascimento;

  tituloFormulario.textContent = 'Editar pessoa';
  textoFormulario.textContent = 'Altere os dados e salve.';
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelar.hidden = false;

  formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
  formulario.elements.nome.focus();
  atualizarLista(); // destaca a linha
}

// Volta o formulário ao modo de cadastro
function encerrarEdicao() {
  idEmEdicao = null;
  formulario.reset();

  tituloFormulario.textContent = 'Cadastro de pessoa';
  textoFormulario.textContent = 'Preencha os dados abaixo para cadastrar.';
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

  const dados = {
    nome: formulario.elements.nome.value,
    nascimento: formulario.elements.nascimento.value
  };

  // POST para cadastrar, PUT para editar
  const endereco = editando ? `${API_PESSOAS}/${idEmEdicao}` : API_PESSOAS;
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
    formulario.elements.nome.focus();
    mostrarMensagem(editando ? 'Pessoa atualizada.' : 'Pessoa cadastrada com sucesso.', 'sucesso');
    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  } finally {
    botaoSalvar.disabled = false;
  }
});


// Exclui a pessoa depois de confirmar
async function excluirPessoa(pessoa) {
  const confirmou = confirm(
    `Excluir o cadastro de ${pessoa.nome}?\nSe ela tiver usuário ou cadastro de paciente, eles também serão excluídos, junto com os agendamentos.`
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_PESSOAS}/${pessoa.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
    } else {
      // Se a pessoa excluída estava aberta no formulário, limpa o formulário
      if (pessoa.id === idEmEdicao) {
        encerrarEdicao();
      }

      mostrarMensagem(`Cadastro de ${pessoa.nome} excluído.`, 'sucesso');
    }

    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  }
}


// Início
formulario.elements.nascimento.max = hoje();
atualizarLista();
