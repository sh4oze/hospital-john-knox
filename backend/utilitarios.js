// Funções usadas pelas rotas

const banco = require('./banco');


// Envia a resposta em JSON (sem dados, envia só o status)
function responder(res, status, dados) {
  if (dados === undefined) {
    res.writeHead(status);
    return res.end();
  }

  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

// Lê o JSON enviado pela página (null se for inválido)
function lerCorpo(req) {
  return new Promise(function (resolve, reject) {
    let corpo = '';

    req.setEncoding('utf8'); // para os acentos
    req.on('data', function (parte) {
      corpo += parte;
    });

    req.on('end', function () {
      try {
        resolve(corpo === '' ? {} : JSON.parse(corpo));
      } catch {
        resolve(null);
      }
    });

    req.on('error', reject);
  });
}

// Converte o id da URL em número (null se for inválido)
function lerId(texto) {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Faz o INSERT ou UPDATE. Se for um erro conhecido do banco,
// responde 400 com a mensagem e retorna null.
async function gravar(res, sql, valores, traduzirErro) {
  try {
    return await banco.executar(sql, valores);
  } catch (erro) {
    const mensagem = traduzirErro(erro);

    if (!mensagem) {
      throw erro; // erro inesperado
    }

    responder(res, 400, { erro: mensagem });
    return null;
  }
}


module.exports = { responder, lerCorpo, lerId, gravar };
