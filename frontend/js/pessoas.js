/* ==========================================================
   HOSPITAL JOHN KNOX — SCRIPT DA TELA DE PESSOAS (pessoas.html)
   Conversa com o back-end (API) para listar, cadastrar
   e excluir pessoas no banco de dados MySQL.
   Funções de apoio (mensagens, datas, tabela) ficam em comum.js.
   ========================================================== */

// Endereço da API no back-end
const API = '/api/pessoas';

// Elementos da página usados neste arquivo
const formulario = document.getElementById('form-pessoa');
const botaoCadastrar = document.getElementById('botao-cadastrar');
const contador = document.getElementById('contador');
const tabela = document.getElementById('tabela-pessoas');
const lista = document.getElementById('lista-pessoas');
const listaVazia = document.getElementById('lista-vazia');


/* ===== DATAS ===== */

// "1990-05-12" → "36 anos"
function calcularIdade(nascimento) {
  const [ano, mes, dia] = nascimento.split('-').map(Number);
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;

  let idade = agora.getFullYear() - ano;

  // Se ainda não fez aniversário este ano, tem um ano a menos
  if (mesAtual < mes || (mesAtual === mes && agora.getDate() < dia)) {
    idade--;
  }

  if (idade < 1) {
    return 'Menos de 1 ano';
  }

  return idade === 1 ? '1 ano' : `${idade} anos`;
}

// Data de hoje no formato "AAAA-MM-DD" (usada para bloquear datas futuras)
function hoje() {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}


/* ===== LISTAR PESSOAS ===== */
async function carregarPessoas() {
  try {
    const resposta = await fetch(API);

    if (!resposta.ok) {
      throw new Error();
    }

    mostrarPessoas(await resposta.json());
  } catch {
    mostrarMensagem('Não foi possível carregar as pessoas. Verifique se o servidor está ligado.', 'erro');
  }
}

// Monta uma linha da tabela para cada pessoa
function mostrarPessoas(pessoas) {
  lista.innerHTML = '';
  contador.textContent = pessoas.length;

  // Sem pessoas: esconde a tabela e mostra o aviso
  tabela.hidden = pessoas.length === 0;
  listaVazia.hidden = pessoas.length > 0;

  pessoas.forEach(function (pessoa) {
    const linha = document.createElement('tr');

    linha.append(
      criarCelula(pessoa.nome, `Cadastrado em ${formatarData(pessoa.data_criacao)}`),
      criarCelula(formatarData(pessoa.nascimento), calcularIdade(pessoa.nascimento)),
      criarCelulaAcoes([
        criarBotao('Excluir', 'botao-excluir', function () {
          excluirPessoa(pessoa);
        })
      ])
    );

    lista.append(linha);
  });
}


/* ===== CADASTRAR PESSOA ===== */
formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault(); // impede a página de recarregar

  const dados = {
    nome: formulario.elements.nome.value,
    nascimento: formulario.elements.nascimento.value
  };

  // Bloqueia o botão para evitar cadastro duplicado com vários cliques
  botaoCadastrar.disabled = true;

  try {
    const resposta = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
      return;
    }

    formulario.reset();
    formulario.elements.nome.focus();
    mostrarMensagem('Pessoa cadastrada com sucesso.', 'sucesso');
    carregarPessoas();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  } finally {
    botaoCadastrar.disabled = false;
  }
});


/* ===== EXCLUIR PESSOA =====
   Pede confirmação e apaga a pessoa do banco de dados.
   Se ela tiver um usuário, o banco apaga o usuário junto. */
async function excluirPessoa(pessoa) {
  const confirmou = confirm(
    `Excluir o cadastro de ${pessoa.nome}?\nSe ela tiver um usuário, ele também será excluído.`
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API}/${pessoa.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
    } else {
      mostrarMensagem(`Cadastro de ${pessoa.nome} excluído.`, 'sucesso');
    }

    carregarPessoas();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  }
}


/* ===== INÍCIO ===== */
formulario.elements.nascimento.max = hoje();
carregarPessoas();
