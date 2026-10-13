/* ==========================================================
   HOSPITAL JOHN KNOX — FUNÇÕES COMUNS DAS TELAS DE CADASTRO
   Usado por pessoas.html e usuarios.html.
   Precisa ser carregado ANTES do script de cada página.
   ========================================================== */


/* ===== DATAS ===== */

// "1990-05-12" ou "2026-09-28 14:30:00" → "12/05/1990"
function formatarData(texto) {
  const [ano, mes, dia] = texto.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}


/* ===== MENSAGENS =====
   Mostra um aviso no elemento com id="mensagem".
   tipo: "sucesso" (verde) ou "erro" (vermelho).
   Mensagens de sucesso somem sozinhas depois de 4 segundos. */
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

// Lê a mensagem de erro enviada pelo servidor
async function lerErro(resposta) {
  try {
    const resultado = await resposta.json();
    return resultado.erro || 'Ocorreu um erro inesperado.';
  } catch {
    return 'Ocorreu um erro inesperado.';
  }
}


/* ===== TABELA ===== */

// Cria uma célula com um texto principal e um detalhe menor embaixo.
// textContent garante que o texto seja exibido como texto, nunca como HTML.
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

// Cria a célula de ações com os botões informados
function criarCelulaAcoes(botoes) {
  const celula = document.createElement('td');
  const grupo = document.createElement('div');

  grupo.className = 'acoes';
  grupo.append(...botoes);
  celula.append(grupo);

  return celula;
}

// Cria um botão de ação (ex.: "Editar", "Excluir")
function criarBotao(texto, classe, aoClicar) {
  const botao = document.createElement('button');

  botao.type = 'button';
  botao.className = `botao-acao ${classe}`;
  botao.textContent = texto;
  botao.addEventListener('click', aoClicar);

  return botao;
}


/* ===== RODAPÉ ===== */
document.getElementById('ano').textContent = new Date().getFullYear();
