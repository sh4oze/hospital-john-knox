// Servidor do Hospital John Knox, feito só com Node nativo.
// Entrega as páginas da pasta frontend e responde a API em /api.

const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const banco = require('./banco');
const { responder } = require('./utilitarios');
const rotasPessoas = require('./rotas/pessoas');
const rotasUsuarios = require('./rotas/usuarios');
const rotasPacientes = require('./rotas/pacientes');
const rotasAgendamentos = require('./rotas/agendamentos');

// Rotas da API
const ROTAS_DA_API = {
  pessoas: rotasPessoas,
  usuarios: rotasUsuarios,
  pacientes: rotasPacientes,
  agendamentos: rotasAgendamentos
};

const PORTA = process.env.PORTA || 3000;
const PASTA_FRONTEND = path.join(__dirname, '..', 'frontend');

// Tipos de arquivo que o servidor entrega
const TIPOS_DE_ARQUIVO = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};


// Entrega um arquivo da pasta frontend
async function entregarArquivo(res, caminhoDaUrl) {
  if (caminhoDaUrl === '/') {
    caminhoDaUrl = '/index.html';
  }

  try {
    const caminho = path.join(PASTA_FRONTEND, decodeURIComponent(caminhoDaUrl));

    // Não deixa acessar arquivos fora da pasta frontend (como o .env)
    if (!caminho.startsWith(PASTA_FRONTEND + path.sep)) {
      throw new Error('Fora da pasta frontend');
    }

    const conteudo = await fs.readFile(caminho);
    const tipo = TIPOS_DE_ARQUIVO[path.extname(caminho)] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': tipo });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página não encontrada.');
  }
}


// Trata cada requisição. /api/pessoas/5 vira ["api", "pessoas", "5"]
async function tratarRequisicao(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const [inicio, recurso, id, ...resto] = url.pathname.split('/').filter(Boolean);

  // O que não for /api é arquivo do site
  if (inicio !== 'api') {
    return entregarArquivo(res, url.pathname);
  }

  // Chama a rota do recurso, passando o id (se tiver)
  if (resto.length === 0 && Object.hasOwn(ROTAS_DA_API, recurso)) {
    return ROTAS_DA_API[recurso](req, res, id);
  }

  responder(res, 404, { erro: 'Rota não encontrada.' });
}


// Erros inesperados viram resposta 500
const servidor = http.createServer(async function (req, res) {
  try {
    await tratarRequisicao(req, res);
  } catch (erro) {
    console.error(erro);
    responder(res, 500, { erro: 'Erro interno no servidor.' });
  }
});


// Testa o banco antes de ligar o servidor
banco.consultar('SELECT 1 AS ok')
  .then(function () {
    servidor.listen(PORTA, function () {
      console.log(`Servidor rodando em http://localhost:${PORTA}`);
    });
  })
  .catch(function (erro) {
    console.error('Não foi possível conectar ao MySQL:', erro.message);
    process.exit(1);
  });
