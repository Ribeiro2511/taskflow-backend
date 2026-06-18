/**
 * routes/taskRoutes.js
 *
 * Define os endpoints de tarefas. Todas as rotas exigem
 * autenticação (authMiddleware aplicado uma vez, no topo,
 * com router.use — vale para todas as rotas deste arquivo).
 *
 * Endpoints:
 *   GET    /api/tasks            → lista as tarefas do usuário
 *   POST   /api/tasks            → cria uma tarefa
 *   GET    /api/tasks/:id        → busca uma tarefa específica
 *   PUT    /api/tasks/:id        → edita uma tarefa
 *   PATCH  /api/tasks/:id/status → altera apenas o status
 *   DELETE /api/tasks/:id        → exclui uma tarefa
 *   GET    /api/tasks/:id/history → histórico de alterações
 */

const express  = require('express');
const { body, param, query } = require('express-validator');
const router   = express.Router();

const taskController = require('../controllers/taskController');
const authMiddleware  = require('../middlewares/auth');

// Todas as rotas abaixo passam primeiro pelo middleware de autenticação
router.use(authMiddleware);

// ----------------------------------------------------------
// Validações reutilizáveis
// ----------------------------------------------------------
const idValidation = [
  param('id').isInt().withMessage('Id inválido.'),
];

const criarValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('O título é obrigatório.')
    .isLength({ min: 3, max: 200 }).withMessage('O título deve ter entre 3 e 200 caracteres.'),

  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 }).withMessage('A descrição deve ter no máximo 1000 caracteres.'),

  body('priority')
    .optional({ checkFalsy: true })
    .isIn(['baixa', 'media', 'alta']).withMessage('Prioridade inválida. Use baixa, media ou alta.'),

  body('responsible')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('O responsável deve ter no máximo 100 caracteres.'),

  body('due_date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Data limite inválida. Use o formato AAAA-MM-DD.'),
];

const editarValidation = [
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('O título deve ter entre 3 e 200 caracteres.'),

  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 }).withMessage('A descrição deve ter no máximo 1000 caracteres.'),

  body('priority')
    .optional({ checkFalsy: true })
    .isIn(['baixa', 'media', 'alta']).withMessage('Prioridade inválida. Use baixa, media ou alta.'),

  body('responsible')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('O responsável deve ter no máximo 100 caracteres.'),

  body('due_date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Data limite inválida. Use o formato AAAA-MM-DD.'),
];

const statusValidation = [
  body('status')
    .notEmpty().withMessage('O status é obrigatório.')
    .isIn(['pendente', 'em_andamento', 'concluida'])
    .withMessage('Status inválido. Use pendente, em_andamento ou concluida.'),
];

const listarValidation = [
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['pendente', 'em_andamento', 'concluida']).withMessage('Status inválido para filtro.'),

  query('priority')
    .optional({ checkFalsy: true })
    .isIn(['baixa', 'media', 'alta']).withMessage('Prioridade inválida para filtro.'),

  query('responsible')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Filtro de responsável muito longo.'),

  query('due_date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Data limite inválida no filtro. Use o formato AAAA-MM-DD.'),

  query('search')
    .optional({ checkFalsy: true })
    .isLength({ max: 200 }).withMessage('Termo de busca muito longo.'),
];

// ----------------------------------------------------------
// Rotas
// ----------------------------------------------------------
router.get('/',                  listarValidation,                   taskController.listar);
router.post('/',                 criarValidation,                     taskController.criar);
router.get('/:id',                idValidation,                       taskController.buscarPorId);
router.put('/:id',                [...idValidation, ...editarValidation], taskController.editar);
router.patch('/:id/status',       [...idValidation, ...statusValidation], taskController.alterarStatus);
router.delete('/:id',              idValidation,                      taskController.excluir);
router.get('/:id/history',        idValidation,                       taskController.historico);

module.exports = router;
