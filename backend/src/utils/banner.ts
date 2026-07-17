import chalk from 'chalk';

const ascii = `
 ╔══════════════════════════════════════════════════════════════╗
 ║  ██████   ██████   ██████                                    ║
 ║     ██  ██       ██                                          ║
 ║    ██   ██   ███ ██████                                      ║
 ║   ██    ██    ██ ██                                           ║
 ║  ██████  ██████   ██████                                      ║
 ║                                                              ║
 ║  ██████ ██████   █████  ██████ ██████ ██████                 ║
 ║     ██  ██  ██ ██   ██ ██      ██      ██  ██                ║
 ║    ██   █████  ███████ ██████  █████   █████                  ║
 ║   ██    ██  ██ ██   ██     ██ ██      ██  ██                ║
 ║  ██████ ██  ██ ██   ██ ██████ ██████ ██  ██                 ║
 ╚══════════════════════════════════════════════════════════════╝
`;

export function showStartupBanner(port: number | string) {
  const lines = ascii.split('\n');
  const colors = [chalk.red, chalk.white, chalk.blue, chalk.red, chalk.white, chalk.blue];
  let output = '\n';
  lines.forEach((line, i) => {
    const colorFn = colors[i % colors.length];
    output += colorFn(line) + '\n';
  });
  output += chalk.cyan('\n ──► Server: ') + chalk.green(`http://localhost:${port}`) + '\n';
  output += chalk.cyan(' ──► Docs:  ') + chalk.green(`http://localhost:${port}/api/docs`) + '\n';
  output += chalk.cyan(' ──► Mode:  ') + chalk.yellow(process.env.NODE_ENV || 'development') + '\n';
  output += chalk.gray(` ──► Time:  ${new Date().toISOString()}\n`);
  console.log(output);
}

export function mongoSuccess() {
  const bar = chalk.bgGreen.white.bold(' ✓ ');
  const msg = chalk.green.bold('MongoDB Connected');
  const details = chalk.gray(` | ${new Date().toLocaleTimeString()}`);
  console.log(`\n${bar} ${msg}${details}\n`);
}

export function mongoError(err: string) {
  const bar = chalk.bgRed.white.bold(' ✗ ');
  const msg = chalk.red.bold('MongoDB Connection Failed');
  const details = chalk.gray(` | ${err}`);
  console.error(`\n${bar} ${msg}${details}\n`);
}

export function mongoReconnect() {
  const bar = chalk.bgYellow.black.bold(' ↻ ');
  const msg = chalk.yellow.bold('MongoDB Reconnecting...');
  console.log(`\n${bar} ${msg}\n`);
}

export function mongoDisconnected() {
  const bar = chalk.bgRed.white.bold(' ⚡ ');
  const msg = chalk.red.bold('MongoDB Disconnected');
  console.log(`\n${bar} ${msg}\n`);
}
