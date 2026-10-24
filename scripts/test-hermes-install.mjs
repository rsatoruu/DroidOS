// Test install Hermes Agent via compose deploy endpoint from browser
async function installViaCompose() {
  const login = await fetch('http://localhost:7070/api/auth/login', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username: 'ramad', password: 'ramad123@' })
  });
  const loginData = await login.json();
  const token = loginData.data?.token;
  console.log('Login:', loginData.success ? '✅ OK' : '❌ FAILED');

  const hermesYaml = [
    'services:',
    '  hermes:',
    '    image: nousresearch/hermes-agent:latest',
    '    container_name: hermes',
    '    restart: unless-stopped',
    '    ports:',
    "      - '8642:8642'",
    '    volumes:',
    '      - hermes-data:/opt/data',
    '    environment:',
    '      - HERMES_UID=1000',
    '      - HERMES_GID=1000',
    '      - API_SERVER_HOST=0.0.0.0',
    '      - API_SERVER_KEY=droidos-hermes-key',
    'volumes:',
    '  hermes-data:',
    '    name: hermes-data'
  ].join('\n');

  const res = await fetch('http://localhost:7070/api/docker/compose', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml: hermesYaml, name: 'Hermes Agent' })
  });
  const data = await res.json();
  console.log('Deploy result:', JSON.stringify(data, null, 2));
}
installViaCompose().catch(console.error);
