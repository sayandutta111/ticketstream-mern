/**
 * Development Server Orchestrator
 * Spawns both Express backend and Vite frontend concurrently
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('  Starting MERN Ticket Processing Application...  ');
console.log('==================================================\n');

let frontend;

// Start Backend
const backend = spawn('node', ['--watch', 'server.js'], {
  cwd: path.resolve(__dirname, '../backend'),
  stdio: 'inherit',
  shell: true
});

// Start Frontend after a short startup buffer so backend is listening
setTimeout(() => {
  frontend = spawn('npx.cmd', ['vite'], {
    cwd: path.resolve(__dirname, '../frontend'),
    stdio: 'inherit',
    shell: true
  });
}, 800);

process.on('SIGINT', () => {
  backend.kill('SIGINT');
  if (frontend) frontend.kill('SIGINT');
  process.exit();
});

