/**
 * routes/authRoutes.js
 *
 * Define os endpoints de autenticação e aplica as validações
 * de entrada antes de chamar o controller.
 *
 * Separar validação da lógica de negócio mantém cada arquivo
 * com uma única responsabilidade (princípio do SRP).
 *
 * Endpoints:
 *   POST /api/auth/register  → cria conta
 *   POST /api/auth/login     → faz login
 *   GET  /api/auth/me        → dados do usuário logado
 */

const express    = require('express');
const { body }   = require('express-validator');
const router     = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');

// ----------------------------------------------------------
// Regras de validação reutilizáveis
// express-validator valida o corpo da requisição antes
// de o controller ser chamado — erros retornam 400.
// ----------------------------------------------------------
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('O nome é obrigatório.')
    .isLength({ min: 2, max: 100 }).withMessage('O nome deve ter entre 2 e 100 caracteres.'),

  body('email')
    .trim()
    .notEmpty().withMessage('O e-mail é obrigatório.')
    .isEmail().withMessage('Informe um e-mail válido.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('A senha é obrigatória.')
    .isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirme a senha.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('As senhas não coincidem.');
      }
      return true;
    }),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('O e-mail é obrigatório.')
    .isEmail().withMessage('Informe um e-mail válido.'),

  body('password')
    .notEmpty().withMessage('A senha é obrigatória.'),
];

// ----------------------------------------------------------
// Rotas
// ----------------------------------------------------------
router.post('/register', registerValidation, authController.register);
router.post('/login',    loginValidation,    authController.login);
router.get('/me',        authMiddleware,     authController.me);

module.exports = router;
