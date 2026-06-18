/**
 * server.js
 *
 * Ponto de entrada da aplicação.
 * Configura e inicializa o servidor Express com:
 *  - helmet:  adiciona headers de segurança HTTP
 *  - cors:    permite requisições do frontend
 *  - express.json: interpreta o body das requisições como JSON
 *  - rotas:   mapeia os endpoints para os roteadores
 *
 * Para iniciar: npm run dev  (com nodemon)
 *               npm start    (produção)
 */

require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');

// Rede de segurança: se algo escapar de todos os try/catch e chegar
// até aqui, pelo menos vamos VER o motivo no terminal em vez do
// servidor simplesmente parar de responder sem explicação nenhuma.
process.on('uncaughtException', (err) => {
  console.error('💥 Exceção não tratada:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('💥 Promise rejeitada sem tratamento:', err);
});

const authRoutes      = require('./routes/authRoutes');
const taskRoutes      = require('./routes/taskRoutes'); // Etapa 2
const dashboardRoutes = require('./routes/dashboardRoutes'); // Etapa 3

const app  = express();


// ----------------------------------------------------------
// Middlewares globais
// ----------------------------------------------------------

// Adiciona headers de segurança (X-Content-Type, etc.)
app.use(helmet());

// Configura CORS para aceitar apenas o origin do frontend
app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Interpreta o body como JSON (limit evita payloads gigantes)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------
// Rotas
// ----------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes); // Etapa 2
app.use('/api/dashboard', dashboardRoutes); // Etapa 3

// Rota de health check — útil para verificar se a API está no ar
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----------------------------------------------------------
// Handler para rotas não encontradas (404)
// ----------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ----------------------------------------------------------
// Handler global de erros não capturados
// ----------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ----------------------------------------------------------
// Inicia o servidor
// ----------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

const PORT = process.env.PORT || 3000;

// Só roda o listen se NÃO estiver na Vercel (ambiente local)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor rodando localmente na porta ${PORT}`);
    });
}

// ISSO AQUI É OBRIGATÓRIO PARA A VERCEL:
module.exports = app;


