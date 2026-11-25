// Rotas da API REST: tudo que começa com /api/tarefas
const express = require('express');
const { db } = require('../database/database');

const router = express.Router();

const COLUNAS = 'id, titulo, disciplina, status, criada_em';
const sqlListar = db.prepare(`SELECT ${COLUNAS} FROM tarefas ORDER BY id DESC`);
const sqlBuscar = db.prepare(`SELECT ${COLUNAS} FROM tarefas WHERE id = ?`);
const sqlInserir = db.prepare('INSERT INTO tarefas (titulo, disciplina) VALUES (?, ?)');
const sqlAtualizar = db.prepare('UPDATE tarefas SET titulo = ?, disciplina = ? WHERE id = ?');
const sqlConcluir = db.prepare("UPDATE tarefas SET status = 'Concluída' WHERE id = ?");
const sqlExcluir = db.prepare('DELETE FROM tarefas WHERE id = ?');

// Repete no servidor os tipos e limites exigidos pelo formulário.
function lerDados(corpo) {
  if (typeof corpo?.titulo !== 'string' || typeof corpo?.disciplina !== 'string') return null;
  const titulo = corpo.titulo.trim();
  const disciplina = corpo.disciplina.trim();
  if (!titulo || titulo.length > 120 || !disciplina || disciplina.length > 80) return null;
  return { titulo, disciplina };
}

const erroDados = (res) =>
  res.status(400).json({ erro: 'Informe título e disciplina como texto. Use de 1 a 120 caracteres no título e de 1 a 80 na disciplina.' });
const erroNaoEncontrada = (res) =>
  res.status(404).json({ erro: 'Tarefa não encontrada.' });

// GET /api/tarefas -> lista todas as tarefas
router.get('/', (req, res) => {
  res.json(sqlListar.all());
});

// POST /api/tarefas -> cadastra (status nasce "Pendente" pelo DEFAULT da tabela)
router.post('/', (req, res) => {
  const dados = lerDados(req.body);
  if (!dados) return erroDados(res);
  const { lastInsertRowid } = sqlInserir.run(dados.titulo, dados.disciplina);
  res.status(201).json(sqlBuscar.get(lastInsertRowid));
});

// PUT /api/tarefas/:id -> edita título e disciplina
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const dados = lerDados(req.body);
  if (!dados) return erroDados(res);
  const { changes } = sqlAtualizar.run(dados.titulo, dados.disciplina, id);
  if (!changes) return erroNaoEncontrada(res);
  res.json(sqlBuscar.get(id));
});

// PATCH /api/tarefas/:id/concluir -> muda o status para "Concluída"
router.patch('/:id/concluir', (req, res) => {
  const id = Number(req.params.id);
  const { changes } = sqlConcluir.run(id);
  if (!changes) return erroNaoEncontrada(res);
  res.json(sqlBuscar.get(id));
});

// DELETE /api/tarefas/:id -> exclui
router.delete('/:id', (req, res) => {
  const { changes } = sqlExcluir.run(Number(req.params.id));
  if (!changes) return erroNaoEncontrada(res);
  res.status(204).end();
});

module.exports = router;
