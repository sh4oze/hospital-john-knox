/* ==========================================================
   HOSPITAL JOHN KNOX — SCRIPT DA TELA DE USUÁRIOS (usuarios.html)
   CRUD completo: listar, cadastrar, editar e excluir usuários
   no banco de dados MySQL, por meio da API do back-end.
   Funções de apoio (mensagens, datas, tabela) ficam em comum.js.
   ========================================================== */

// Endereços da API no back-end
const API_USUARIOS = '/api/usuarios';
const API_PESSOAS = '/api/pessoas';

// Nome exibido para cada tipo de usuário
const NOMES_DOS_TIPOS = {
  admin: 'Administrador',
  medico: 'Médico'
};

// Elementos da página usados neste arquivo
const formulario = document.getElementById('form-usuario');
const tituloFormulario = document.getElementById('titulo-formulario');
const textoFormulario = document.getElementById('texto-formulario');
const selectPessoa = document.getElementById('select-pessoa');
const campoSenha = document.getElementById('campo-senha');
const dicaSenha = document.getElementById('dica-senha');
const botaoSalvar = document.getElementById('botao-salvar');
const botaoCancelar = document.getElementById('botao-cancelar');
const contador = document.getElementById('contador');
const tabela = document.getElementById('tabela-usuarios');
const lista = document.getElementById('lista-usuarios');
const listaVazia = document.getElementById('lista-vazia');

// Id do usuário em edição. null = o formulário está cadastrando.
let idEmEdicao = null;


/* ===== PESSOAS (lista de seleção) ===== */
async function carregarPessoas() {
  const resposta = await fetch(API_PESSOAS);

  if (!resposta.ok) {
    throw new Error();
  }

  const pessoas = await resposta.json();

  // Primeira opção: instrução para o usuário
  const primeira = new Option(
    pessoas.length > 0 ? 'Selecione uma pessoa' : 'Cadastre uma pessoa primeiro',
    ''
  );
  selectPessoa.replaceChildren(primeira);

  // Uma opção para cada pessoa (new Option usa texto puro, não HTML)
  pessoas.forEach(function (pessoa) {
    selectPessoa.append(new Option(pessoa.nome, pessoa.id));
  });
}


/* ===== LISTAR USUÁRIOS ===== */
async function carregarUsuarios() {
  const resposta = await fetch(API_USUARIOS);

  if (!resposta.ok) {
    throw new Error();
  }

  mostrarUsuarios(await resposta.json());
}

// Monta uma linha da tabela para cada usuário
function mostrarUsuarios(usuarios) {
  lista.innerHTML = '';
  contador.textContent = usuarios.length;

  // Sem usuários: esconde a tabela e mostra o aviso
  tabela.hidden = usuarios.length === 0;
  listaVazia.hidden = usuarios.length > 0;

  usuarios.forEach(function (usuario) {
    const linha = document.createElement('tr');

    // Destaca a linha que está aberta no formulário
    if (usuario.id === idEmEdicao) {
      linha.className = 'em-edicao';
    }

    linha.append(
      criarCelula(usuario.login, usuario.pessoa_nome),
      criarCelulaTipo(usuario.tipo_usuario),
      criarCelulaAcoes([
        criarBotao('Editar', 'botao-editar', function () {
          iniciarEdicao(usuario);
        }),
        criarBotao('Excluir', 'botao-excluir', function () {
          excluirUsuario(usuario);
        })
      ])
    );

    lista.append(linha);
  });
}

// Célula com a etiqueta do tipo (Administrador / Médico)
function criarCelulaTipo(tipo) {
  const celula = document.createElement('td');
  const etiqueta = document.createElement('span');

  etiqueta.className = `etiqueta etiqueta-${tipo}`;
  etiqueta.textContent = NOMES_DOS_TIPOS[tipo];
  celula.append(etiqueta);

  return celula;
}

// Recarrega a lista mostrando aviso se o servidor não responder
async function atualizarLista() {
  try {
    await carregarUsuarios();
  } catch {
    mostrarMensagem('Não foi possível carregar os usuários. Verifique se o servidor está ligado.', 'erro');
  }
}


/* ===== MODO DE EDIÇÃO =====
   Preenche o formulário com os dados do usuário escolhido. */
function iniciarEdicao(usuario) {
  idEmEdicao = usuario.id;

  formulario.elements.pessoa_id.value = usuario.pessoa_id;
  formulario.elements.login.value = usuario.login;
  formulario.elements.senha.value = '';
  formulario.elements.tipo_usuario.value = usuario.tipo_usuario;

  // Na edição a senha é opcional
  campoSenha.required = false;
  dicaSenha.hidden = false;

  tituloFormulario.textContent = 'Editar usuário';
  textoFormulario.textContent = 'Altere os dados e salve.';
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelar.hidden = false;

  formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
  formulario.elements.login.focus();
  atualizarLista(); // para destacar a linha em edição
}

// Volta o formulário ao modo de cadastro
function encerrarEdicao() {
  idEmEdicao = null;
  formulario.reset();

  campoSenha.required = true;
  dicaSenha.hidden = true;

  tituloFormulario.textContent = 'Cadastro de usuário';
  textoFormulario.textContent = 'Crie o acesso de uma pessoa ao sistema.';
  botaoSalvar.textContent = 'Cadastrar';
  botaoCancelar.hidden = true;
}

botaoCancelar.addEventListener('click', function () {
  encerrarEdicao();
  atualizarLista();
});


/* ===== SALVAR (cadastrar ou editar) ===== */
formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault(); // impede a página de recarregar

  const editando = idEmEdicao !== null;

  const dados = {
    pessoa_id: Number(formulario.elements.pessoa_id.value),
    login: formulario.elements.login.value,
    senha: formulario.elements.senha.value,
    tipo_usuario: formulario.elements.tipo_usuario.value
  };

  // Cadastro usa POST; edição usa PUT no endereço do usuário
  const endereco = editando ? `${API_USUARIOS}/${idEmEdicao}` : API_USUARIOS;
  const metodo = editando ? 'PUT' : 'POST';

  // Bloqueia o botão para evitar envio duplicado com vários cliques
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
    mostrarMensagem(editando ? 'Usuário atualizado.' : 'Usuário cadastrado com sucesso.', 'sucesso');
    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  } finally {
    botaoSalvar.disabled = false;
  }
});


/* ===== EXCLUIR USUÁRIO =====
   Pede confirmação e apaga o usuário do banco de dados.
   A pessoa ligada a ele continua cadastrada. */
async function excluirUsuario(usuario) {
  const confirmou = confirm(
    `Excluir o usuário "${usuario.login}"?\nA pessoa ${usuario.pessoa_nome} continua cadastrada.`
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_USUARIOS}/${usuario.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
    } else {
      // Se o usuário excluído estava aberto no formulário, limpa o formulário
      if (usuario.id === idEmEdicao) {
        encerrarEdicao();
      }

      mostrarMensagem(`Usuário "${usuario.login}" excluído.`, 'sucesso');
    }

    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  }
}


/* ===== INÍCIO =====
   Carrega as pessoas (para a lista de seleção) e os usuários. */
Promise.all([carregarPessoas(), carregarUsuarios()]).catch(function () {
  mostrarMensagem('Não foi possível carregar os dados. Verifique se o servidor está ligado.', 'erro');
});
