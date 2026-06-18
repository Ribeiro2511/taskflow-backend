/**
 * controllers/authController.js
 *
 * Contém toda a lógica de negócio para autenticação:
 *  - register: cria um novo usuário com senha hasheada
 *  - login:    valida credenciais e retorna um token JWT
 *  - me:       retorna os dados do usuário logado
 *
 * Os controllers não fazem validação de formato — isso fica
 * nas rotas (express-validator). Aqui tratamos apenas a
 * lógica de negócio e os erros do banco.
 */

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/database');
const { validationResult } = require('express-validator');

// ----------------------------------------------------------
// Utilitário: gera um token JWT para o usuário informado
// ----------------------------------------------------------
const gerarToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ----------------------------------------------------------
// POST /auth/register
// Cria um novo usuário. Retorna o token já na resposta para
// que o frontend faça login automático após o cadastro.
// ----------------------------------------------------------
const register = async (req, res) => {
  // Checa erros de validação das rotas
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Verifica se o e-mail já está em uso
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // Gera o hash da senha (custo 10 = bom equilíbrio segurança/performance)
    const passwordHash = await bcrypt.hash(password, 10);

    // Insere o usuário e retorna os dados criados
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email.toLowerCase(), passwordHash]
    );

    const user  = result.rows[0];
    const token = gerarToken(user);

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });

  } catch (err) {
    console.error('[register]', err.message);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};

// ----------------------------------------------------------
// POST /auth/login
// Valida as credenciais e retorna um token JWT.
// A mensagem de erro é genérica de propósito (não revela
// se o e-mail existe ou não — boa prática de segurança).
// ----------------------------------------------------------
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Busca o usuário pelo e-mail
    const result = await pool.query(
      'SELECT id, name, email, password FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    // Compara a senha mesmo se o usuário não existir (evita timing attacks)
    const senhaFake = '$2a$10$invalido.hash.para.evitar.timing.attack.aqui';
    const hashParaComparar = user ? user.password : senhaFake;
    const senhaCorreta = await bcrypt.compare(password, hashParaComparar);

    if (!user || !senhaCorreta) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = gerarToken(user);

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });

  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};

// ----------------------------------------------------------
// GET /auth/me  (rota protegida)
// Retorna os dados do usuário autenticado.
// Útil para o frontend recuperar o perfil ao recarregar.
// ----------------------------------------------------------
const me = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.status(200).json({ user: result.rows[0] });

  } catch (err) {
    console.error('[me]', err.message);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

module.exports = { register, login, me };
