// Servidor web: entrega a interface (pasta public/) e a API (/api/tarefas).
const express = require('express');
const path = require('path');
const { caminhoBanco } = require('./database/database');
const rotasTarefas = require('./routes/tarefas');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json()); // lê o corpo JSON enviado pelo frontend

// Mostra no terminal cada chamada da API (útil para explicar o caminho do cadastro).
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public'))); // index.html, style.css, app.js
app.use('/api/tarefas', rotasTarefas);
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Tratamento de erros (ex.: JSON inválido na requisição).
app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(erro.status || 500).json({ erro: 'Não foi possível processar a requisição.' });
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
  console.log(`Banco de dados: ${caminhoBanco}`);
});
