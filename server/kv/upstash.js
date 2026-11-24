// Cliente de Upstash Redis por REST (sin dependencias). Lo crea la integración de Vercel Marketplace.
import { ONCE_SCRIPT } from './once.js';
export function upstashConfigFromEnv(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

export function createUpstashKv({ url, token, fetchImpl = fetch }) {
  async function post(path, body) {
    const r = await fetchImpl(url + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) throw new Error(`Upstash respondió ${r.status}${j?.error ? `: ${j.error}` : ''}`);
    return j;
  }
  return {
    kind: 'upstash',
    async cmd(...args) {
      const j = await post('', args.map(String));
      if (j.error) throw new Error(j.error);
      return j.result;
    },
    async pipeline(cmds) {
      if (!cmds.length) return [];
      const j = await post('/pipeline', cmds.map((c) => c.map(String)));
      return j.map((x) => {
        if (x.error) throw new Error(x.error);
        return x.result;
      });
    },
    async once(key, cmds) {
      return this.cmd('EVAL', ONCE_SCRIPT, '1', key, JSON.stringify(cmds.map((c) => c.map(String))));
    },
  };
}
