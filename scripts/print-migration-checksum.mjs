#!/usr/bin/env node
/**
 * Prints SHA-256 checksum for a migration.sql file (same algorithm Prisma uses for _prisma_migrations.checksum).
 * Usage: node scripts/print-migration-checksum.mjs prisma/migrations/<name>/migration.sql
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/print-migration-checksum.mjs <path/to/migration.sql>');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');
const checksum = createHash('sha256').update(sql, 'utf8').digest('hex');
console.log(checksum);
console.error('(use this value in: UPDATE "_prisma_migrations" SET checksum = \'<value>\' WHERE migration_name = \'...\';)');
