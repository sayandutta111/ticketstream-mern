/**
 * Development Server Orchestrator
 * Spawns both Express backend and Vite frontend concurrently
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('  Starting MERN Ticket Processing Application...  ');
console.log('==================================================\n');

// Start Backend
const backend = spawn('node', ['server.js'], {
  cwd: path.resolve(__dirname, '../backend'),
  stdio: 'inherit',
  shell: true
});

// Start Frontend (Vite)
const frontend = spawn('npx.cmd', ['vite'], {
  cwd: path.resolve(__dirname, '../frontend'),
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit();
});
