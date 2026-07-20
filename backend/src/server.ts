import { app } from './app';
import { connectDB } from './config/db';
import { seedData } from './services/seed.service';
import { initSocket } from './services/socket';
import { env } from './config/env';
import logger from './utils/logger';
import { showStartupBanner } from './utils/banner';
import chalk from 'chalk';

process.on('uncaughtException', (err) => {
  console.error(chalk.bgRed.white.bold('\n UNCAUGHT EXCEPTION '), chalk.red(err.message));
  logger.error(`Uncaught exception: ${err.message}\n${err.stack}`);
});
process.on('unhandledRejection', (reason) => {
  console.error(chalk.bgRed.white.bold('\n UNHANDLED REJECTION '), chalk.red(String(reason)));
  logger.error(`Unhandled rejection: ${String(reason)}`);
});

async function start() {
  try {
    await connectDB();
    await seedData();
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      initSocket(server);
      showStartupBanner(env.PORT);
      logger.info(`Server running on http://0.0.0.0:${env.PORT}`);
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(chalk.bgRed.white.bold(`\n PORT ${env.PORT} IN USE `) + chalk.red(`\n Close the other server or use a different port.\n`));
        logger.error(`Port ${env.PORT} already in use. Close other server or use different port.`);
        process.exit(1);
      } else {
        console.error(chalk.bgRed.white.bold('\n SERVER ERROR '), chalk.red(err.message));
        logger.error(`Server error: ${err.message}`);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error(chalk.bgRed.white.bold('\n FAILED TO START '), chalk.red(String(err)));
    logger.error('Failed to start server:', err);
    setTimeout(start, 5000);
  }
}

start();