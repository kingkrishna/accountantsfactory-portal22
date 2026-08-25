const { execSync } = require('child_process');

process.env.DATABASE_URL = 'mysql://root:ruHCQrofefcKdcgqxUMCqHZgznXGtlWQ@crossover.proxy.rlwy.net:16887/railway';

console.log('Pushing Prisma schema to Railway MySQL...');
try {
  execSync('node node_modules/prisma/build/index.js db push --schema=prisma/schema.prisma --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('Schema push complete!');
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
