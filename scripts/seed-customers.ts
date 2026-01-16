import { PrismaClient } from '@prisma/client';
import { query } from '../src/lib/pg-client';

const prisma = new PrismaClient();

async function main() {
  // Get the first connection
  const connection = await prisma.connection.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!connection) {
    console.error('No connection found');
    process.exit(1);
  }

  console.log(`Using connection: ${connection.name}`);

  // Check existing data
  console.log('\n📊 Existing customers:');
  const existing = await query(connection.connectionString, 'SELECT COUNT(*) as count FROM customers');
  console.log(`Current count: ${existing[0]?.count}`);

  // Insert new customers with varied dates (using unique timestamp in email to avoid duplicates)
  console.log('\n➕ Inserting new customers with varied dates...');

  const timestamp = Date.now();
  const insertSQL = `
    INSERT INTO customers (first_name, last_name, email, city, created_at) VALUES
    -- Janeiro 2026
    ('Ana', 'Costa', 'ana.costa.${timestamp}@email.com', 'São Paulo', '2026-01-05 10:30:00'),
    ('Bruno', 'Lima', 'bruno.lima.${timestamp}@email.com', 'Rio de Janeiro', '2026-01-12 14:20:00'),

    -- Dezembro 2025
    ('Diego', 'Oliveira', 'diego.oliveira.${timestamp}@email.com', 'Belo Horizonte', '2025-12-03 11:00:00'),
    ('Elena', 'Ferreira', 'elena.ferreira.${timestamp}@email.com', 'São Paulo', '2025-12-15 16:45:00'),
    ('Felipe', 'Almeida', 'felipe.almeida.${timestamp}@email.com', 'Curitiba', '2025-12-22 08:30:00'),
    ('Gabriela', 'Souza', 'gabriela.souza.${timestamp}@email.com', 'Porto Alegre', '2025-12-28 13:00:00'),

    -- Novembro 2025
    ('Hugo', 'Pereira', 'hugo.pereira.${timestamp}@email.com', 'São Paulo', '2025-11-02 10:00:00'),
    ('Isabela', 'Rodrigues', 'isabela.rodrigues.${timestamp}@email.com', 'Salvador', '2025-11-10 15:30:00'),
    ('Jose', 'Martins', 'jose.martins.${timestamp}@email.com', 'Fortaleza', '2025-11-20 12:15:00'),

    -- Outubro 2025
    ('Karen', 'Nascimento', 'karen.nascimento.${timestamp}@email.com', 'Rio de Janeiro', '2025-10-05 09:00:00'),
    ('Lucas', 'Ribeiro', 'lucas.ribeiro.${timestamp}@email.com', 'São Paulo', '2025-10-18 14:00:00'),
    ('Mariana', 'Castro', 'mariana.castro.${timestamp}@email.com', 'Brasília', '2025-10-25 11:00:00'),

    -- Setembro 2025
    ('Nicolas', 'Gomes', 'nicolas.gomes.${timestamp}@email.com', 'Recife', '2025-09-08 11:30:00'),
    ('Olivia', 'Barbosa', 'olivia.barbosa.${timestamp}@email.com', 'São Paulo', '2025-09-15 16:00:00'),
    ('Paulo', 'Mendes', 'paulo.mendes.${timestamp}@email.com', 'Manaus', '2025-09-25 09:45:00'),

    -- Agosto 2025
    ('Raquel', 'Santos', 'raquel.santos.${timestamp}@email.com', 'Curitiba', '2025-08-12 10:45:00'),
    ('Samuel', 'Lima', 'samuel.lima.${timestamp}@email.com', 'São Paulo', '2025-08-20 13:30:00'),

    -- Julho 2025
    ('Tatiana', 'Costa', 'tatiana.costa.${timestamp}@email.com', 'Rio de Janeiro', '2025-07-05 14:00:00'),
    ('Vinicius', 'Pereira', 'vinicius.pereira.${timestamp}@email.com', 'Belo Horizonte', '2025-07-18 10:30:00')
  `;

  try {
    await query(connection.connectionString, insertSQL);
    console.log('✅ Customers inserted successfully!');
  } catch (error) {
    console.error('Error inserting:', error);
    await prisma.$disconnect();
    return;
  }

  // Verify
  console.log('\n📊 New customer count:');
  const newCount = await query(connection.connectionString, 'SELECT COUNT(*) as count FROM customers');
  console.log(`Total count: ${newCount[0]?.count}`);

  // Show customers by month
  console.log('\n📅 Customers by month:');
  const byMonth = await query(
    connection.connectionString,
    `SELECT
       to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
       COUNT(*) as count
     FROM customers
     GROUP BY date_trunc('month', created_at)
     ORDER BY month DESC`
  );

  byMonth.forEach((row: any) => {
    console.log(`  ${row.month}: ${row.count} customers`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
