const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no Pool do PostgreSQL:', err);
});

// Inicializa o banco com o SEU script em inglês
const inicializarBanco = async () => {
  const queryTabelas = `
    CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100)        NOT NULL,
        email       VARCHAR(255)        NOT NULL UNIQUE,
        password    VARCHAR(255)        NOT NULL,
        created_at  TIMESTAMP           DEFAULT NOW(),
        updated_at  TIMESTAMP           DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(200)        NOT NULL,
        description TEXT,
        status      VARCHAR(20)         NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
        priority    VARCHAR(10)         NOT NULL DEFAULT 'media'
                    CHECK (priority IN ('baixa', 'media', 'alta')),
        responsible VARCHAR(100),
        due_date    DATE,
        created_at  TIMESTAMP           DEFAULT NOW(),
        updated_at  TIMESTAMP           DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS task_history (
        id          SERIAL PRIMARY KEY,
        task_id     INTEGER             NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id     INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        field       VARCHAR(50)         NOT NULL,
        old_value   TEXT,
        new_value   TEXT,
        changed_at  TIMESTAMP           DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id   ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date  ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_history_task_id ON task_history(task_id);
  `;
  try {
    await pool.query(queryTabelas);
    console.log('--- Tabelas e Índices verificados/criados com sucesso ---');
  } catch (error) {
    console.error('Erro ao inicializar tabelas no banco:', error);
  }
};

inicializarBanco();

module.exports = pool;