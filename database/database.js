// Acesso ao banco: abre (ou cria) o arquivo SQLite e garante que a tabela exista.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const pastaDados = path.join(__dirname, '..', 'data');
const caminhoBanco = path.join(pastaDados, 'tarefas.db');

fs.mkdirSync(pastaDados, { recursive: true });  // cria a pasta data/ se ela não existir
const db = new Database(caminhoBanco);          // cria data/tarefas.db na primeira execução
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

module.exports = { db, caminhoBanco };
