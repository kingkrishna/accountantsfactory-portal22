/**
 * Post-install script for Zoho Catalyst deployment.
 * Regenerates Prisma Client for the Linux environment.
 */

const { execSync } = require('child_process');
const path = require('path');

// Skip in CI and Render
if (process.env.CI || process.env.RENDER) {
  console.log('Skipping Zoho post-install (CI/Render environment detected)');
  process.exit(0);
}

console.log('Running post-installation setup...');
console.log('Regenerating Prisma Client for Linux environment...');

const prismaBin = path.join(__dirname, 'node_modules', '.bin', 'prisma');
const prismaJs = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');

try {
  // Try local binary first, fall back to node direct call
  try {
    execSync(`node "${prismaJs}" generate`, { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    execSync(`"${prismaBin}" generate`, { stdio: 'inherit', cwd: __dirname });
  }
  console.log('Prisma Client regenerated successfully!');
} catch (error) {
  console.warn('Warning: Prisma generate failed:', error.message);
  // Do NOT exit(1) — let npm install succeed regardless
}
