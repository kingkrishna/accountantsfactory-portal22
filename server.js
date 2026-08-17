/**
 * Root-level entry point for Render deployment.
 * Boots the backend server from the /backend directory.
 */
const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, 'api');

const child = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env
});

child.on('close', (code) => process.exit(code || 0));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
