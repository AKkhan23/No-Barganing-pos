import winston from 'winston';
import chalk from 'chalk';

const levelColors: Record<string, (s: string) => string> = {
  error: chalk.bgRed.white.bold,
  warn: chalk.bgHex('#FFA500').white.bold,
  info: chalk.bgHex('#2563EB').white.bold,
  debug: chalk.gray,
  verbose: chalk.dim,
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const colorFn = levelColors[level] || ((s: string) => s);
      const badge = colorFn(` ${level.toUpperCase().padEnd(5)} `);
      const metaStr = Object.keys(meta).length ? chalk.gray(` ${JSON.stringify(meta)}`) : '';
      return `${chalk.gray(timestamp)} ${badge} ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
