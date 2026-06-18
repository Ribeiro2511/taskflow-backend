/**
 * middlewares/auth.js
 *
 * Middleware que protege rotas privadas.
 * Toda rota que precisar de login deve usar este middleware.
 *
 * Como funciona:
 *  1. O cliente envia o token no header: Authorization: Bearer <token>
 *  2. Este middleware extrai e valida o token com JWT
 *  3. Se válido, injeta os dados do usuário em req.user e chama next()
 *  4. Se inválido, retorna 401 (não autorizado)
 *
 * Uso numa rota:
 *   router.get('/tarefas', authMiddleware, taskController.listar);
 */

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Extrai o header Authorization
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  // 2. O formato esperado é "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const token = parts[1];

  // 3. Verifica a assinatura e a expiração do token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Injeta os dados do usuário para uso nos controllers
    req.user = { id: decoded.id, email: decoded.email };

    next(); // tudo certo, continua para a rota
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

module.exports = authMiddleware;
