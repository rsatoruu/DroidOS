import Database from 'better-sqlite3';
import { join } from 'node:path';
import { homedir } from 'node:os';

const termuxHome = process.env.DROIDOS_DATA_DIR || process.env.DATA_DIR || join(homedir(), '.droidos');
const dbPath = join(termuxHome, 'data', 'droidos.db');
const db = new Database(dbPath);

// Delete duplicate/old entries for 9router and headroom
db.prepare("DELETE FROM app_instances WHERE definition_id IN (SELECT id FROM app_definitions WHERE name LIKE '%9router%' OR name LIKE '%headroom%' OR name LIKE '%Headroom%')").run();
db.prepare("DELETE FROM app_definitions WHERE name LIKE '%9router%' OR name LIKE '%headroom%' OR name LIKE '%Headroom%'").run();

const now = new Date().toISOString();

// Insert clean 9router
db.prepare(`
  INSERT INTO app_definitions (
    id, name, description, version, icon, category, runtime,
    working_dir, start_command, stop_command, env_vars, port,
    restart_policy, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  '9router-app',
  '9router',
  'Docker: decolua/9router:latest',
  'latest',
  'Container',
  'Docker Compose',
  'docker',
  '',
  'docker start 9router',
  'docker stop 9router',
  JSON.stringify({
    DATA_DIR: '/app/data',
    PORT: '20128',
    HOSTNAME: '0.0.0.0',
    NODE_ENV: 'production',
    HEADROOM_URL: 'http://headroom:8787',
  }),
  20128,
  'always',
  now,
  now
);

db.prepare(`
  INSERT INTO app_instances (id, definition_id, status, health_status, updated_at)
  VALUES ('9router-inst', '9router-app', 'running', 'healthy', ?)
`).run(now);

// Insert clean Headroom
db.prepare(`
  INSERT INTO app_definitions (
    id, name, description, version, icon, category, runtime,
    working_dir, start_command, stop_command, env_vars, port,
    restart_policy, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'headroom-app',
  'Headroom',
  'Docker: ghcr.io/chopratejas/headroom:latest',
  'latest',
  'Container',
  'Docker Compose',
  'docker',
  '',
  'docker start headroom',
  'docker stop headroom',
  '{}',
  8787,
  'always',
  now,
  now
);

db.prepare(`
  INSERT INTO app_instances (id, definition_id, status, health_status, updated_at)
  VALUES ('headroom-inst', 'headroom-app', 'running', 'healthy', ?)
`).run(now);

const apps = db.prepare('SELECT d.id, d.name, d.port, i.status FROM app_definitions d JOIN app_instances i ON d.id = i.definition_id').all();
console.log('✅ Clean Apps registered in DroidOS:', apps);
