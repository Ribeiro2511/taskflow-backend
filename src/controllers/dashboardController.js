/**
 * controllers/dashboardController.js
 *
 * Indicadores agregados das tarefas do usuário logado, usados
 * na tela inicial (dashboard). Os números são calculados em
 * tempo real direto no banco a cada requisição — não há
 * nenhum valor "fixo" ou de exemplo.
 */

const pool = require('../config/database');

// ----------------------------------------------------------
// GET /api/dashboard
// Retorna a contagem de tarefas pendentes, em andamento,
// concluídas, atrasadas e o total do usuário logado.
//
// "Atrasada" = prazo (due_date) já passou e o status ainda
// não é 'concluida'. Uma tarefa concluída nunca é considerada
// atrasada, mesmo que tenha sido finalizada após o prazo.
// ----------------------------------------------------------
const resumo = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pendente')                                   AS pendentes,
         COUNT(*) FILTER (WHERE status = 'em_andamento')                                AS em_andamento,
         COUNT(*) FILTER (WHERE status = 'concluida')                                   AS concluidas,
         COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'concluida')      AS atrasadas,
         COUNT(*)                                                                       AS total
       FROM tasks
       WHERE user_id = $1`,
      [req.user.id]
    );

    const linha = result.rows[0];

    return res.status(200).json({
      pendentes:    Number(linha.pendentes),
      em_andamento: Number(linha.em_andamento),
      concluidas:   Number(linha.concluidas),
      atrasadas:    Number(linha.atrasadas),
      total:        Number(linha.total),
    });
  } catch (err) {
    console.error('[dashboard.resumo]', err.message);
    return res.status(500).json({ error: 'Erro interno ao calcular indicadores do dashboard.' });
  }
};

module.exports = { resumo };
