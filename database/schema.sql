-- Esquema do banco (SQLite).
-- É executado toda vez que o servidor inicia; "IF NOT EXISTS" evita recriar a tabela.
CREATE TABLE IF NOT EXISTS tarefas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo     TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'Pendente'
             CHECK (status IN ('Pendente', 'Concluída')),
  criada_em  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
