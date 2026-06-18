/**
 * utils/taskHistory.js
 *
 * Funções auxiliares para registrar o histórico de alterações
 * de uma tarefa na tabela task_history.
 *
 * Estratégia: comparamos os valores "antes" e "depois" campo a
 * campo. Para cada campo que realmente mudou, inserimos uma
 * linha no histórico. Assim cada entrada do histórico conta
 * exatamente "o que mudou, de quê para quê".
 */

const pool = require('../config/database');

// Campos que fazem sentido registrar no histórico
const CAMPOS_RASTREADOS = ['title', 'description', 'priority', 'responsible', 'due_date', 'status'];

/**
 * Compara o estado anterior e o novo de uma tarefa e grava
 * no histórico apenas os campos que mudaram.
 *
 * @param {number} taskId - id da tarefa alterada
 * @param {number} userId - id do usuário que fez a alteração
 * @param {object} before - estado da tarefa antes da alteração
 * @param {object} after  - estado da tarefa depois da alteração
 */
const registrarAlteracoes = async (taskId, userId, before, after) => {
  const mudancas = [];

  for (const campo of CAMPOS_RASTREADOS) {
    const valorAntigo = before[campo] ?? null;
    const valorNovo   = after[campo] ?? null;

    // Compara como string para evitar falso-positivo (ex: Date vs string)
    const antigoStr = valorAntigo instanceof Date ? valorAntigo.toISOString().slice(0, 10) : valorAntigo;
    const novoStr    = valorNovo instanceof Date ? valorNovo.toISOString().slice(0, 10) : valorNovo;

    if (String(antigoStr ?? '') !== String(novoStr ?? '')) {
      mudancas.push({ campo, antigoStr, novoStr });
    }
  }

  if (mudancas.length === 0) return; // nada mudou, não gera histórico

  // Insere todas as mudanças. Como são poucas por requisição,
  // inserimos em sequência (sem necessidade de transação complexa).
  for (const m of mudancas) {
    await pool.query(
      `INSERT INTO task_history (task_id, user_id, field, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [taskId, userId, m.campo, m.antigoStr, m.novoStr]
    );
  }
};

/**
 * Registra a criação de uma tarefa como primeira entrada do histórico.
 */
const registrarCriacao = async (taskId, userId) => {
  await pool.query(
    `INSERT INTO task_history (task_id, user_id, field, old_value, new_value)
     VALUES ($1, $2, 'tarefa', NULL, 'criada')`,
    [taskId, userId]
  );
};

module.exports = { registrarAlteracoes, registrarCriacao };
