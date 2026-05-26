/**
 * Quick DB connectivity check. Run from services/api:
 *   node scripts/test-db-connection.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    console.log('OK — connected to database. User count:', count);
  } catch (e) {
    console.error('FAILED —', e.message);
    console.error('\nTry DATABASE_URL with pooler port 6543 (see .env.example).');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
