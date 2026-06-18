/**
 * routes/dashboardRoutes.js
 *
 * Endpoint:
 *   GET /api/dashboard → indicadores do usuário logado
 */

const express = require('express');
const router  = express.Router();

const dashboardController = require('../controllers/dashboardController');
const authMiddleware       = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', dashboardController.resumo);

module.exports = router;
