// Tela de usuários: listar, cadastrar, editar e excluir

// Endereços da API
const API_USUARIOS = '/api/usuarios';
const API_PESSOAS = '/api/pessoas';

// Nome de cada tipo na tela
const NOMES_DOS_TIPOS = {
  admin: 'Administrador',
  medico: 'Médico'
};

// Elementos da página
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

// Id em edição (null quando está cadastrando)
let idEmEdicao = null;


// Preenche a lista de pessoas
async function carregarPessoas() {
  const pessoas = await buscarLista(API_PESSOAS);

  preencherSelect(selectPessoa, pessoas, 'Selecione uma pessoa', 'Cadastre uma pessoa primeiro', function (pessoa) {
    return pessoa.nome;
  });
}


// Lista de usuários
async function carregarUsuarios() {
  mostrarUsuarios(await buscarLista(API_USUARIOS));
}

// Monta a tabela
function mostrarUsuarios(usuarios) {
  lista.innerHTML = '';
  contador.textContent = usuarios.length;

  // Sem registros, mostra o aviso no lugar da tabela
  tabela.hidden = usuarios.length === 0;
  listaVazia.hidden = usuarios.length > 0;

  usuarios.forEach(function (usuario) {
    const linha = document.createElement('tr');

    // Destaca a linha em edição
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

// Célula com a etiqueta do tipo
function criarCelulaTipo(tipo) {
  const celula = document.createElement('td');
  const etiqueta = document.createElement('span');

  etiqueta.className = `etiqueta etiqueta-${tipo}`;
  etiqueta.textContent = NOMES_DOS_TIPOS[tipo];
  celula.append(etiqueta);

  return celula;
}

// Recarrega a lista
async function atualizarLista() {
  try {
    await carregarUsuarios();
  } catch {
    mostrarMensagem('Não foi possível carregar os usuários. Verifique se o servidor está ligado.', 'erro');
  }
}


// Abre o registro no formulário para editar
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
  atualizarLista(); // destaca a linha
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


// Salvar (cadastro ou edição)
formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault(); // não recarrega a página

  const editando = idEmEdicao !== null;

  const dados = {
    pessoa_id: Number(formulario.elements.pessoa_id.value),
    login: formulario.elements.login.value,
    senha: formulario.elements.senha.value,
    tipo_usuario: formulario.elements.tipo_usuario.value
  };

  // POST para cadastrar, PUT para editar
  const endereco = editando ? `${API_USUARIOS}/${idEmEdicao}` : API_USUARIOS;
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
    mostrarMensagem(editando ? 'Usuário atualizado.' : 'Usuário cadastrado com sucesso.', 'sucesso');
    atualizarLista();
  } catch {
    mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
  } finally {
    botaoSalvar.disabled = false;
  }
});


// Exclui o usuário depois de confirmar
async function excluirUsuario(usuario) {
  let aviso = `Excluir o usuário "${usuario.login}"?\nA pessoa ${usuario.pessoa_nome} continua cadastrada.`;

  if (usuario.tipo_usuario === 'medico') {
    aviso += '\nOs agendamentos deste médico também serão excluídos.';
  }

  const confirmou = confirm(aviso);

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_USUARIOS}/${usuario.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem(await lerErro(resposta), 'erro');
    } else {
      // Se estava em edição, limpa o formulário
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


// Início
Promise.all([carregarPessoas(), carregarUsuarios()]).catch(function () {
  mostrarMensagem('Não foi possível carregar os dados. Verifique se o servidor está ligado.', 'erro');
});
