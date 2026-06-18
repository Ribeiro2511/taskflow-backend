const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // A maioria dos bancos Postgres na nuvem (Neon, Supabase, Render...)
  // exige conexão criptografada. Ative com DB_SSL=true nas variáveis
  // de ambiente quando for usar um banco assim (não afeta o Postgres
  // local, que continua sem SSL por padrão).
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// IMPORTANTE: sem este listener, qualquer erro assíncrono em uma
// conexão ociosa do pool (ex: o banco cair, rede instável) derruba
// o processo Node inteiro com um erro não tratado. Com o listener,
// o erro só é logado e o servidor continua de pé.
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do PostgreSQL:', err.message);
});

// Testa a conexão usando Promises (Mais seguro e moderno)
pool.connect()
  .then(client => {
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    client.release(); // Devolve a conexão ao pool imediatamente
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
  });

module.exports = pool;
