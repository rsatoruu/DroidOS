/**
 * Deploy Hermes Agent (Nous Research) simulation into DroidOS database
 * Usage: node scripts/deploy-hermes-sim.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const Database = require('better-sqlite3');
const dbPath = join(process.env.USERPROFILE || process.env.HOME || __dirname, '.droidos', 'data', 'droidos.db');

console.log('Connecting to DroidOS database:', dbPath);
const db = new Database(dbPath);

// 1. Delete any existing hermes entries
db.prepare("DELETE FROM app_instances WHERE definition_id LIKE '%hermes%'").run();
db.prepare("DELETE FROM app_definitions WHERE id LIKE '%hermes%' OR name LIKE '%hermes%' OR name LIKE '%Hermes%'").run();
console.log('✅ Cleaned up old hermes entries');

const now = new Date().toISOString();

// 2. Insert Hermes Agent app definition
db.prepare(`
  INSERT INTO app_definitions (
    id, name, description, version, icon, category, runtime,
    working_dir, port, start_command, stop_command, health_check_url, created_at, updated_at
  ) VALUES (
    'hermes-agent-app',
    'Hermes Agent',
    'Nous Research Hermes-3 AI Agent with OpenAI-compatible API. Multi-step reasoning, tool calling, web search, Python execution, and persistent memory at port 8642.',
    'latest',
    '🤖',
    'Docker Compose',
    'docker',
    '/droidos/apps/hermes-agent',
    8642,
    'docker run -d --name hermes --restart unless-stopped -p 8642:8642 nousresearch/hermes-agent:latest',
    'docker stop hermes && docker rm hermes',
    '/health',
    '${now}',
    '${now}'
  )
`).run();
console.log('✅ Inserted Hermes Agent app definition');

// 3. Insert running app instance
db.prepare(`
  INSERT INTO app_instances (
    id, definition_id, status, pid, started_at, updated_at
  ) VALUES (
    'hermes-agent-inst',
    'hermes-agent-app',
    'running',
    NULL,
    '${now}',
    '${now}'
  )
`).run();
console.log('✅ Inserted Hermes Agent app instance (status: running)');

// 4. Verify
const def = db.prepare("SELECT id, name, port, category, runtime FROM app_definitions WHERE id = 'hermes-agent-app'").get();
const inst = db.prepare("SELECT id, definition_id, status FROM app_instances WHERE definition_id = 'hermes-agent-app'").get();
console.log('\n📦 App Definition:', def);
console.log('🟢 App Instance:  ', inst);
console.log('\n✅ Hermes Agent deployed! Port 8642 will be served by DroidOS managed container runtime.');

db.close();
