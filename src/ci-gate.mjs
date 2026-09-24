// Run against your own registered Sentinel sandbox. Scanning obeys its response policy.
const base = (process.env.SENTINEL_URL || '').replace(/\/$/, '');
async function main() {
  const url = new URL(base);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw Error('Use HTTPS, or a local loopback server');
  let token;
  async function request(path, body) {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error('Service returned HTTP ' + response.status);
    return response.json();
  }
  try {
    const session = await request('/auth/login', { username: process.env.SENTINEL_USER, password: process.env.SENTINEL_PASSWORD });
    token = session.token;
    if (session.user.role !== 'defender') throw Error('A defender account is required');
    const apiIds = (process.env.SENTINEL_APIS || 'orders').split(',').map(x => x.trim());
    const scan = await request('/scans', { apiIds, budget: 600, useImported: process.env.SENTINEL_USE_IMPORTED === 'true' });
    if (scan.status !== 'completed') throw Error('Scan incomplete: ' + scan.status);
    const state = await request('/state');
    const findings = state.findings.filter(f => scan.findings.includes(f.id));
    if (findings.length !== scan.findings.length) throw Error('Incomplete finding evidence');
    const blocking = findings.filter(f => f.confidence === 'Confirmed' && ['Critical', 'High'].includes(f.severity));
    console.log(JSON.stringify({ scanId: scan.id, requests: scan.requests, confirmedHighOrCritical: blocking.length, findings }, null, 2));
    // A repair during this scan does not hide the confirmed pre-repair finding.
    process.exitCode = blocking.length ? 1 : 0;
  } finally {
    if (token) await request('/auth/logout', {}).catch(() => {});
  }
}
main().catch(error => { console.error('Gate could not establish a clean result: ' + error.message); process.exitCode = 2; });
