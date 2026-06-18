/**
 * controllers/taskController.js
 *
 * Lógica de negócio do CRUD de tarefas.
 *
 * Regra de isolamento (Controle de Acesso): TODA query é
 * filtrada por user_id = req.user.id. Isso garante que um
 * usuário nunca veja, edite ou exclua tarefa de outro usuário,
 * mesmo que tente adivinhar um id na URL.
 *
 * Filtros e busca textual já estão na listagem (Etapa 3).
 * Os indicadores de dashboard ficam em um controller próprio
 * (dashboardController.js), por se tratar de outro recurso.
 */

const pool = require('../config/database');
const { validationResult } = require('express-validator');
const { registrarAlteracoes, registrarCriacao } = require('../utils/taskHistory');

// ----------------------------------------------------------
// GET /api/tasks
// Lista as tarefas do usuário logado, com suporte a filtros
// combinados e busca textual via query string. Exemplos:
//   /api/tasks?status=pendente
//   /api/tasks?priority=alta&responsible=Maria
//   /api/tasks?search=relatorio
//   /api/tasks?overdue=true
// Todos os filtros podem ser combinados entre si (AND).
// ----------------------------------------------------------
const listar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status, priority, responsible, due_date, overdue, search } = req.query;

  try {
    const condicoes = ['user_id = $1'];
    const valores = [req.user.id];
    let proximoIndice = 2;

    if (status) {
      condicoes.push(`status = $${proximoIndice++}`);
      valores.push(status);
    }

    if (priority) {
      condicoes.push(`priority = $${proximoIndice++}`);
      valores.push(priority);
    }

    if (responsible) {
      condicoes.push(`responsible ILIKE $${proximoIndice++}`);
      valores.push(`%${responsible}%`);
    }

    if (due_date) {
      condicoes.push(`due_date = $${proximoIndice++}`);
      valores.push(due_date);
    }

    // Atalho para "tarefas atrasadas": prazo já passou e ainda não concluída
    if (overdue === 'true') {
      condicoes.push(`due_date < CURRENT_DATE AND status <> 'concluida'`);
    }

    // Busca textual: procura o termo no título OU na descrição
    if (search) {
      condicoes.push(`(title ILIKE $${proximoIndice} OR description ILIKE $${proximoIndice})`);
      valores.push(`%${search}%`);
      proximoIndice++;
    }

    const query = `SELECT * FROM tasks WHERE ${condicoes.join(' AND ')} ORDER BY created_at DESC`;
    const result = await pool.query(query, valores);

    return res.status(200).json({ tasks: result.rows });
  } catch (err) {
    console.error('[tasks.listar]', err.message);
    return res.status(500).json({ error: 'Erro interno ao listar tarefas.' });
  }
};

// ----------------------------------------------------------
// GET /api/tasks/:id
// Retorna uma tarefa específica, se pertencer ao usuário.
// ----------------------------------------------------------
const buscarPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    return res.status(200).json({ task: result.rows[0] });
  } catch (err) {
    console.error('[tasks.buscarPorId]', err.message);
    return res.status(500).json({ error: 'Erro interno ao buscar tarefa.' });
  }
};

// ----------------------------------------------------------
// POST /api/tasks
// Cria uma nova tarefa para o usuário logado.
// ----------------------------------------------------------
const criar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, priority, responsible, due_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, priority, responsible, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        title,
        description || null,
        priority || 'media',
        responsible || null,
        due_date || null,
      ]
    );

    const novaTarefa = result.rows[0];

    // Primeira entrada no histórico
    await registrarCriacao(novaTarefa.id, req.user.id);

    return res.status(201).json({
      message: 'Tarefa criada com sucesso!',
      task: novaTarefa,
    });
  } catch (err) {
    console.error('[tasks.criar]', err.message);
    return res.status(500).json({ error: 'Erro interno ao criar tarefa.' });
  }
};

// ----------------------------------------------------------
// PUT /api/tasks/:id
// Edita título, descrição, prioridade, responsável e prazo.
// Não altera status (isso tem rota própria, abaixo).
// ----------------------------------------------------------
const editar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { title, description, priority, responsible, due_date } = req.body;

  try {
    // Busca o estado atual para comparar no histórico e validar posse
    const atual = await pool.query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (!atual.rows[0]) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    const tarefaAntiga = atual.rows[0];

    const result = await pool.query(
      `UPDATE tasks
          SET title       = $1,
              description = $2,
              priority    = $3,
              responsible = $4,
              due_date    = $5,
              updated_at  = NOW()
        WHERE id = $6 AND user_id = $7
        RETURNING *`,
      [
        title !== undefined ? title : tarefaAntiga.title,
        description !== undefined ? description : tarefaAntiga.description,
        priority !== undefined ? priority : tarefaAntiga.priority,
        responsible !== undefined ? responsible : tarefaAntiga.responsible,
        due_date !== undefined ? due_date : tarefaAntiga.due_date,
        id,
        req.user.id,
      ]
    );

    const tarefaNova = result.rows[0];

    await registrarAlteracoes(id, req.user.id, tarefaAntiga, tarefaNova);

    return res.status(200).json({
      message: 'Tarefa atualizada com sucesso!',
      task: tarefaNova,
    });
  } catch (err) {
    console.error('[tasks.editar]', err.message);
    return res.status(500).json({ error: 'Erro interno ao editar tarefa.' });
  }
};

// ----------------------------------------------------------
// PATCH /api/tasks/:id/status
// Altera apenas o status da tarefa (pendente | em_andamento | concluida).
// Endpoint dedicado porque é a ação mais frequente do sistema
// (ex: arrastar card no quadro, marcar checkbox na lista).
// ----------------------------------------------------------
const alterarStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  try {
    const atual = await pool.query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (!atual.rows[0]) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    const tarefaAntiga = atual.rows[0];

    const result = await pool.query(
      `UPDATE tasks
          SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *`,
      [status, id, req.user.id]
    );

    const tarefaNova = result.rows[0];

    await registrarAlteracoes(id, req.user.id, tarefaAntiga, tarefaNova);

    return res.status(200).json({
      message: 'Status atualizado com sucesso!',
      task: tarefaNova,
    });
  } catch (err) {
    console.error('[tasks.alterarStatus]', err.message);
    return res.status(500).json({ error: 'Erro interno ao alterar status.' });
  }
};

// ----------------------------------------------------------
// DELETE /api/tasks/:id
// Exclui a tarefa (a confirmação visual é responsabilidade
// do frontend — o backend apenas garante que a tarefa
// pertence ao usuário antes de excluir).
// ----------------------------------------------------------
const excluir = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    return res.status(200).json({ message: 'Tarefa excluída com sucesso!' });
  } catch (err) {
    console.error('[tasks.excluir]', err.message);
    return res.status(500).json({ error: 'Erro interno ao excluir tarefa.' });
  }
};

// ----------------------------------------------------------
// GET /api/tasks/:id/history
// Retorna o histórico de alterações de uma tarefa.
// ----------------------------------------------------------
const historico = async (req, res) => {
  const { id } = req.params;

  try {
    // Garante que a tarefa pertence ao usuário antes de mostrar o histórico
    const dono = await pool.query(
      `SELECT id FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (!dono.rows[0]) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    const result = await pool.query(
      `SELECT * FROM task_history WHERE task_id = $1 ORDER BY changed_at DESC`,
      [id]
    );

    return res.status(200).json({ history: result.rows });
  } catch (err) {
    console.error('[tasks.historico]', err.message);
    return res.status(500).json({ error: 'Erro interno ao buscar histórico.' });
  }
};

module.exports = { listar, buscarPorId, criar, editar, alterarStatus, excluir, historico };
