// Print the current encoder schema (src/ai/nn/schema.ts schemaJson()) as JSON.
//   node scripts/nn/ts.mjs scripts/nn/schema.ts
// training/migrate.py uses it to bring older weights to this layout.

import { schemaJson } from '@/ai/nn/schema'

process.stdout.write(JSON.stringify(schemaJson()) + '\n')
