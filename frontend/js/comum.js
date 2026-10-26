// Funções usadas por todas as telas de cadastro (carregar antes do script da página)


// 1990-05-12 vira 12/05/1990
function formatarData(texto) {
  const [ano, mes, dia] = texto.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// 2026-10-20 14:30 vira 20/10/2026 às 14:30
function formatarDataHora(texto) {
  return `${formatarData(texto)} às ${texto.slice(11, 16)}`;
}


// Busca uma lista na API
async function buscarLista(endereco) {
  const resposta = await fetch(endereco);

  if (!resposta.ok) {
    throw new Error();
  }

  return resposta.json();
}

// Preenche um select com os itens da lista (o valor de cada opção é o id)
function preencherSelect(select, itens, textoInicial, textoVazio, textoDoItem) {
  const primeira = new Option(itens.length > 0 ? textoInicial : textoVazio, '');
  select.replaceChildren(primeira);

  itens.forEach(function (item) {
    select.append(new Option(textoDoItem(item), item.id));
  });
}


// Mostra a mensagem de sucesso ou erro (a de sucesso some depois de 4 segundos)
let temporizadorMensagem;

function mostrarMensagem(texto, tipo) {
  const mensagem = document.getElementById('mensagem');

  mensagem.textContent = texto;
  mensagem.className = `mensagem mensagem-${tipo}`;
  mensagem.hidden = false;

  clearTimeout(temporizadorMensagem);

  if (tipo === 'sucesso') {
    temporizadorMensagem = setTimeout(function () {
      mensagem.hidden = true;
    }, 4000);
  }
}

// Pega a mensagem de erro que o servidor mandou
async function lerErro(resposta) {
  try {
    const resultado = await resposta.json();
    return resultado.erro || 'Ocorreu um erro inesperado.';
  } catch {
    return 'Ocorreu um erro inesperado.';
  }
}


// Célula com um texto principal e um detalhe embaixo.
// textContent evita que o texto vire HTML.
function criarCelula(principal, detalhe) {
  const celula = document.createElement('td');

  const textoPrincipal = document.createElement('span');
  textoPrincipal.className = 'celula-principal';
  textoPrincipal.textContent = principal;
  celula.append(textoPrincipal);

  if (detalhe) {
    const textoDetalhe = document.createElement('span');
    textoDetalhe.className = 'celula-detalhe';
    textoDetalhe.textContent = detalhe;
    celula.append(textoDetalhe);
  }

  return celula;
}

// Célula com os botões de ação
function criarCelulaAcoes(botoes) {
  const celula = document.createElement('td');
  const grupo = document.createElement('div');

  grupo.className = 'acoes';
  grupo.append(...botoes);
  celula.append(grupo);

  return celula;
}

// Botão de ação (Editar, Excluir)
function criarBotao(texto, classe, aoClicar) {
  const botao = document.createElement('button');

  botao.type = 'button';
  botao.className = `botao-acao ${classe}`;
  botao.textContent = texto;
  botao.addEventListener('click', aoClicar);

  return botao;
}


// Ano no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();
