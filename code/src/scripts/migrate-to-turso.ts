import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const TURSO_URL = process.env.DATABASE_URL || "libsql://checklist-brenobispobd.aws-ap-south-1.turso.io";
const TURSO_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkwNDE3NjcsImlkIjoiMDFhMDhiMzItMTUwMS03ZjlhLWI3NjYtZThiM2FmMGNkZDNjIiwia2lkIjoidW5KcEFTa2JnRnlaNkpuR293dlJqUm02amlxZXZ0aE5QZDNyZk81NDFTcyIsInJpZCI6ImFiYjQ5M2E1LThhY2UtNGQ3NS04YjlmLTYzMmU2NTFkZmMyOSJ9.vdvDOOT-gR6XyFkV7aEtCtMNzZkgb-Qx-Cr-nUSAg480ruRYKDKUXcb6TQ2lDC28e_24JqmFITb8MFrQKK1QAg";

const localDbPath = path.resolve(__dirname, "../../checklist.db");

async function migrate() {
  console.log("=== INICIANDO MIGRAÇÃO PARA O TURSO ===");
  console.log(`Origem local: ${localDbPath}`);
  console.log(`Destino Turso: ${TURSO_URL}`);

  const localClient = createClient({ url: `file:${localDbPath}` });
  const tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_AUTH_TOKEN });

  // 1. Obter esquemas das tabelas locais
  const tablesRes = await localClient.execute(`
    SELECT name, sql FROM sqlite_master 
    WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE '_mocha_%'
    ORDER BY 
      CASE name
        WHEN 'users' THEN 1
        WHEN 'vehicles' THEN 2
        WHEN 'checklists' THEN 3
        WHEN 'checklist_photos' THEN 4
        WHEN 'checklist_videos' THEN 5
        WHEN 'notifications' THEN 6
        WHEN 'chat_messages' THEN 7
        WHEN 'fleet_checklists' THEN 8
        WHEN 'fleet_damage_marks' THEN 9
        WHEN 'fleet_damage_photos' THEN 10
        ELSE 11
      END
  `);

  console.log(`Tabelas encontradas no banco local: ${tablesRes.rows.length}`);

  // 2. Criar tabelas no Turso
  for (const table of tablesRes.rows) {
    const tableName = table.name as string;
    const tableSql = table.sql as string;
    console.log(`Criando tabela: ${tableName}...`);
    try {
      await tursoClient.execute(tableSql);
      console.log(`✓ Tabela ${tableName} criada.`);
    } catch (err: any) {
      if (err.message && err.message.includes("already exists")) {
        console.log(`ℹ Tabela ${tableName} já existe.`);
      } else {
        console.error(`Erro ao criar tabela ${tableName}:`, err.message);
        throw err;
      }
    }
  }

  // 3. Criar índices no Turso
  const indexesRes = await localClient.execute(`
    SELECT name, sql FROM sqlite_master 
    WHERE type = 'index' 
      AND sql IS NOT NULL 
      AND name NOT LIKE 'sqlite_%'
  `);

  console.log(`Criando ${indexesRes.rows.length} índices...`);
  for (const index of indexesRes.rows) {
    const indexSql = index.sql as string;
    try {
      await tursoClient.execute(indexSql);
    } catch (err: any) {
      // Ignorar se o índice já existir
    }
  }
  console.log("✓ Índices processados.");

  // 4. Copiar dados tabela por tabela
  for (const table of tablesRes.rows) {
    const tableName = table.name as string;
    const rowsRes = await localClient.execute(`SELECT * FROM "${tableName}"`);
    const rows = rowsRes.rows;
    console.log(`\nMigrando dados de ${tableName} (${rows.length} registros)...`);

    if (rows.length === 0) {
      console.log(`Nenhum registro para ${tableName}.`);
      continue;
    }

    // Dividir em lotes de 50 registros
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const statements = chunk.map(row => {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map(col => row[col]);
        return {
          sql: `INSERT OR REPLACE INTO "${tableName}" ("${columns.join('", "')}") VALUES (${placeholders})`,
          args: values as any[]
        };
      });

      await tursoClient.batch(statements, "write");
      process.stdout.write(`  Migrados ${Math.min(i + batchSize, rows.length)} de ${rows.length}\r`);
    }
    console.log(`\n✓ ${tableName}: ${rows.length} registros migrados com sucesso!`);
  }

  // 5. Verificação de integridade
  console.log("\n=== VERIFICAÇÃO DE DADOS NO TURSO ===");
  for (const table of tablesRes.rows) {
    const tableName = table.name as string;
    const countLocal = (await localClient.execute(`SELECT COUNT(*) as c FROM "${tableName}"`)).rows[0].c;
    const countTurso = (await tursoClient.execute(`SELECT COUNT(*) as c FROM "${tableName}"`)).rows[0].c;
    console.log(`${tableName.padEnd(22)} | Local: ${String(countLocal).padStart(5)} | Turso: ${String(countTurso).padStart(5)} | Status: ${countLocal === countTurso ? "CORRETO ✓" : "DIVERGENTE ✗"}`);
  }

  console.log("\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO! ===");
}

migrate().catch(err => {
  console.error("Falha na migração:", err);
  process.exit(1);
});
