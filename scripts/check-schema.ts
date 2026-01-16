import { PrismaClient } from '@prisma/client';
import { query } from '../src/lib/pg-client';

async function main() {
  const prisma = new PrismaClient();
  const conn = await prisma.connection.findFirst({ orderBy: { createdAt: 'desc' } });

  if (!conn) {
    console.log('No connection found');
    return;
  }

  console.log('Connection:', conn.name);

  const tables = ['customers', 'products', 'orders', 'order_items'];

  for (const table of tables) {
    console.log(`\n=== ${table} ===`);
    try {
      const cols = await query<{ column_name: string; data_type: string }>(
        conn.connectionString,
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      if (cols.length === 0) {
        console.log('  (table does not exist)');
      } else {
        cols.forEach((c) => console.log(`  ${c.column_name}: ${c.data_type}`));
      }
    } catch (e: any) {
      console.log('  Error:', e.message);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
