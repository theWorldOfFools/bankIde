import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { startReminderCron } from './jobs/reminderCron.js';

const server = app.listen(config.port, () => {
  console.log(`[server] BankIde berjalan di http://localhost:${config.port}`);
  console.log(`[server] mode=${config.isProduction ? 'production' : 'development'}`);
});

const reminderTask = startReminderCron();

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] menerima ${signal}, menutup aplikasi...`);
  reminderTask.stop();

  const forceExit = setTimeout(() => {
    console.error('[server] shutdown timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('[server] gagal menutup database:', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
