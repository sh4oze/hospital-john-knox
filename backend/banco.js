// Conexão com o MySQL. O Node não tem conector próprio, então o SQL
// é enviado para o mysql.exe, que vem junto com o MySQL Server.

const { execFile } = require('child_process');


// Escapa os valores antes de colocar no SQL (evita SQL Injection)
const CARACTERES_ESPECIAIS = {
  '\0': '\\0',
  '\n': '\\n',
  '\r': '\\r',
  '\b': '\\b',
  '\t': '\\t',
  '\x1a': '\\Z',
  '\\': '\\\\',
  "'": "\\'",
  '"': '\\"'
};

function escapar(valor) {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      throw new Error('Número inválido no SQL.');
    }
    return String(valor);
  }

  const texto = String(valor).replace(/[\0\n\r\b\t\x1a\\'"]/g, function (caractere) {
    return CARACTERES_ESPECIAIS[caractere];
  });

  return `'${texto}'`;
}

// Troca cada ? do SQL pelo valor escapado
function montarSql(sql, valores = []) {
  let posicao = 0;

  return sql.replace(/\?/g, function () {
    return escapar(valores[posicao++]);
  });
}


// Roda o SQL no mysql.exe. A senha vai pela variável MYSQL_PWD.
function rodarNoMysql(sql) {
  return new Promise(function (resolve, reject) {
    const argumentos = [
      `--host=${process.env.DB_HOST}`,
      `--port=${process.env.DB_PORTA}`,
      `--user=${process.env.DB_USUARIO}`,
      `--database=${process.env.DB_NOME}`,
      '--default-character-set=utf8mb4',
      '--batch'
    ];

    const opcoes = {
      env: { ...process.env, MYSQL_PWD: process.env.DB_SENHA },
      maxBuffer: 10 * 1024 * 1024 // 10 MB
    };

    const processo = execFile(process.env.DB_CLIENTE, argumentos, opcoes, function (erro, saida, saidaDeErro) {
      if (erro) {
        // Pega o código do erro do MySQL (como 1062)
        const falha = new Error(saidaDeErro.trim() || erro.message);
        const codigo = /ERROR (\d+)/.exec(saidaDeErro);
        falha.codigo = codigo ? Number(codigo[1]) : null;
        return reject(falha);
      }

      resolve(saida);
    });

    // Envia o SQL
    processo.stdin.end(sql + ';');
  });
}


// Desfaz o escape do modo --batch
function desescapar(texto) {
  return texto.replace(/\\([nt0\\])/g, function (_, letra) {
    return { n: '\n', t: '\t', 0: '\0', '\\': '\\' }[letra];
  });
}

// Transforma a resposta (colunas separadas por TAB) em lista de objetos
function lerTabela(saida) {
  const linhas = saida.split(/\r?\n/).filter(function (linha) {
    return linha !== '';
  });

  if (linhas.length === 0) {
    return [];
  }

  const colunas = linhas[0].split('\t');

  return linhas.slice(1).map(function (linha) {
    const valores = linha.split('\t');
    const registro = {};

    colunas.forEach(function (coluna, i) {
      const valor = desescapar(valores[i]);

      // ids voltam como número
      registro[coluna] = coluna === 'id' || coluna.endsWith('_id') ? Number(valor) : valor;
    });

    return registro;
  });
}


// Para SELECT
async function consultar(sql, valores) {
  const saida = await rodarNoMysql(montarSql(sql, valores));
  return lerTabela(saida);
}

// Para INSERT, UPDATE e DELETE
async function executar(sql, valores) {
  const [resultado] = await consultar(
    `${sql}; SELECT LAST_INSERT_ID() AS idInserido, ROW_COUNT() AS linhasAfetadas`,
    valores
  );

  return {
    idInserido: Number(resultado.idInserido),
    linhasAfetadas: Number(resultado.linhasAfetadas)
  };
}


module.exports = { consultar, executar };
