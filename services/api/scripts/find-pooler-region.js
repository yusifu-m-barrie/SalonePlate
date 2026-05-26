/**
 * Finds the Supabase pooler region for your project.
 * Run from services/api: node scripts/find-pooler-region.js
 */
const { execSync } = require('child_process');
const path = require('path');

const ref = 'yeyzdcrmblsrvtdgzqfv';
const pass = encodeURIComponent('Bintabah@3360');
const regions = [
  'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-central-1', 'eu-central-2', 'eu-north-1',
  'us-east-1', 'us-east-2', 'us-west-1',
  'ap-southeast-1', 'ap-south-1', 'ap-northeast-1',
  'sa-east-1', 'ca-central-1',
  'af-south-1', 'me-south-1',
];

const root = path.join(__dirname, '..');

for (const r of regions) {
  const pooler = `postgresql://postgres.${ref}:${pass}@aws-0-${r}.pooler.supabase.com:5432/postgres?pgbouncer=true&connect_timeout=12`;
  process.env.DATABASE_URL = pooler;
  try {
    execSync('npx prisma db execute --stdin --schema=prisma/schema.prisma', {
      cwd: root,
      input: 'SELECT 1',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 20000,
    });
    console.log('\n✅ Working region:', r);
    console.log('\nPut this in services/api/.env (only one DATABASE_URL line):\n');
    console.log(`DATABASE_URL=${pooler}\n`);
    process.exit(0);
  } catch (e) {
    const err = e.stderr?.toString() || e.message || '';
    if (err.includes('Tenant or user not found')) {
      console.log('✗', r, '(wrong region)');
    } else if (err.includes("Can't reach")) {
      console.log('✗', r, '(unreachable)');
    } else if (err.includes('password')) {
      console.log('✗', r, '(bad password — fix password in script)');
      process.exit(1);
    } else {
      console.log('✗', r);
    }
  }
}

console.log('\nNo region worked. In Supabase: Connect → ORM → Prisma → copy Session pooler URI exactly.');
process.exit(1);
