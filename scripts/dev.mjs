// Levanta la API (puerto 8787) y Vite (puerto 5173) juntos para desarrollo.
import { spawn } from 'node:child_process';

const procs = [
  spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit', env: { ...process.env, PORT: '8787' } }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => { if (code) { stop(); process.exit(code); } }));
