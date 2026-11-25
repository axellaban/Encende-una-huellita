// Emulador mínimo de Redis en memoria (con persistencia opcional a un archivo JSON).
// Implementa sólo los comandos que usa server/store.js. Sirve para desarrollo local y para los tests,
// así la lógica de datos es la misma que en producción con Upstash.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ONCE_SCRIPT } from './once.js';

export function createMemoryKv({ file } = {}) {
  /** @type {Map<string, {t:'s'|'h'|'z'|'l', v:any, exp?:number}>} */
  const data = new Map();

  if (file && existsSync(file)) {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    for (const [k, e] of raw) {
      if (e.t === 'h') e.v = new Map(e.v);
      if (e.t === 'z') e.v = new Map(e.v);
      data.set(k, e);
    }
  }

  let timer = null;
  function persist() {
    if (!file) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 200);
  }
  function flush() {
    if (!file) return;
    clearTimeout(timer);
    mkdirSync(dirname(file), { recursive: true });
    const out = [...data].map(([k, e]) => [k, { ...e, v: e.t === 'h' || e.t === 'z' ? [...e.v] : e.v }]);
    writeFileSync(file + '.tmp', JSON.stringify(out));
    renameSync(file + '.tmp', file);
  }

  function live(k) {
    const e = data.get(k);
    if (!e) return null;
    if (e.exp && e.exp <= Date.now()) {
      data.delete(k);
      return null;
    }
    return e;
  }
  function of(k, t, create) {
    let e = live(k);
    if (!e && create) {
      e = { t, v: t === 's' ? null : t === 'l' ? [] : new Map() };
      data.set(k, e);
    }
    if (e && e.t !== t) throw new Error('WRONGTYPE');
    return e;
  }
  const idx = (i, n) => (i < 0 ? n + i : i);
  const zsorted = (e) => [...e.v].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));

  const WRITES = new Set(['SET', 'DEL', 'INCR', 'INCRBY', 'EXPIRE', 'HSET', 'HSETNX', 'HINCRBY', 'HDEL', 'ZADD', 'ZREM', 'ZREMRANGEBYSCORE', 'LPUSH', 'LTRIM', 'SADD']);

  function exec(cmd) {
    const [name, ...a] = cmd.map(String);
    const op = name.toUpperCase();
    const r = run(op, a);
    if (WRITES.has(op)) persist();
    return r;
  }

  function once(key, cmds) {
    if (exec(['EXISTS', key])) return 0;
    for (const cmd of cmds) exec(cmd);
    exec(['SET', key, '1']);
    return 1;
  }

  function run(op, a) {
    switch (op) {
      case 'HUELLITA_ASSEMBLE': {
        const parts = a.slice(1).map((key) => exec(['GET', key]));
        if (parts.some((p) => p === null)) throw new Error('Falta una parte del recuerdo');
        exec(['SET', a[0], parts.join('')]);
        exec(['DEL', ...a.slice(1)]);
        return 'OK';
      }
      case 'EVAL':
        if (a[0] !== ONCE_SCRIPT || a[1] !== '1') throw new Error('Script no soportado');
        return once(a[2], JSON.parse(a[3]));
      case 'GET': {
        const e = of(a[0], 's');
        return e ? e.v : null;
      }
      case 'SET': {
        const nx = a.some((x) => x.toUpperCase() === 'NX');
        const exAt = a.findIndex((x) => x.toUpperCase() === 'EX');
        if (nx && live(a[0])) return null;
        data.set(a[0], { t: 's', v: a[1], exp: exAt > 0 ? Date.now() + Number(a[exAt + 1]) * 1000 : undefined });
        return 'OK';
      }
      case 'DEL': {
        let n = 0;
        for (const k of a) if (live(k) && data.delete(k)) n++;
        return n;
      }
      case 'EXISTS':
        return a.filter((k) => live(k)).length;
      case 'INCR': {
        const e = of(a[0], 's', true);
        e.v = String((Number(e.v) || 0) + 1);
        return Number(e.v);
      }
      case 'INCRBY': {
        const e = of(a[0], 's', true);
        e.v = String((Number(e.v) || 0) + Number(a[1]));
        return Number(e.v);
      }
      case 'MGET':
        return a.map((k) => { const e = live(k); return e && e.t === 's' ? e.v : null; });
      case 'SADD': {
        const e = of(a[0], 'h', true);
        let n = 0;
        for (const m of a.slice(1)) if (!e.v.has(m)) { e.v.set(m, '1'); n++; }
        return n;
      }
      case 'SCARD':
        return of(a[0], 'h')?.v.size ?? 0;
      case 'ZRANGEBYSCORE': {
        const e = of(a[0], 'z');
        if (!e) return [];
        const min = a[1] === '-inf' ? -Infinity : Number(a[1]);
        const max = a[2] === '+inf' ? Infinity : Number(a[2]);
        let out = zsorted(e).filter(([, sc]) => sc >= min && sc <= max).map((x) => x[0]);
        const li = a.findIndex((x) => x.toUpperCase() === 'LIMIT');
        if (li > 0) out = out.slice(Number(a[li + 1]), Number(a[li + 1]) + Number(a[li + 2]));
        return out;
      }
      case 'EXPIRE': {
        const e = live(a[0]);
        if (!e) return 0;
        e.exp = Date.now() + Number(a[1]) * 1000;
        return 1;
      }
      case 'HSET': {
        const e = of(a[0], 'h', true);
        let n = 0;
        for (let i = 1; i < a.length; i += 2) {
          if (!e.v.has(a[i])) n++;
          e.v.set(a[i], a[i + 1]);
        }
        return n;
      }
      case 'HSETNX': {
        const e = of(a[0], 'h', true);
        if (e.v.has(a[1])) return 0;
        e.v.set(a[1], a[2]);
        return 1;
      }
      case 'HGET': {
        const e = of(a[0], 'h');
        return e?.v.get(a[1]) ?? null;
      }
      case 'HGETALL': {
        const e = of(a[0], 'h');
        return e ? [...e.v].flat() : [];
      }
      case 'HINCRBY': {
        const e = of(a[0], 'h', true);
        const v = (Number(e.v.get(a[1])) || 0) + Number(a[2]);
        e.v.set(a[1], String(v));
        return v;
      }
      case 'HDEL': {
        const e = of(a[0], 'h');
        let n = 0;
        for (const f of a.slice(1)) if (e?.v.delete(f)) n++;
        return n;
      }
      case 'ZADD': {
        const e = of(a[0], 'z', true);
        let n = 0;
        for (let i = 1; i < a.length; i += 2) {
          if (!e.v.has(a[i + 1])) n++;
          e.v.set(a[i + 1], Number(a[i]));
        }
        return n;
      }
      case 'ZREM': {
        const e = of(a[0], 'z');
        let n = 0;
        for (const m of a.slice(1)) if (e?.v.delete(m)) n++;
        return n;
      }
      case 'ZCARD':
        return of(a[0], 'z')?.v.size ?? 0;
      case 'ZRANGE': {
        const e = of(a[0], 'z');
        if (!e) return [];
        const s = zsorted(e);
        return s.slice(idx(Number(a[1]), s.length), idx(Number(a[2]), s.length) + 1).map((x) => x[0]);
      }
      case 'ZREMRANGEBYSCORE': {
        const e = of(a[0], 'z');
        if (!e) return 0;
        const min = a[1] === '-inf' ? -Infinity : Number(a[1]);
        const max = a[2] === '+inf' ? Infinity : Number(a[2]);
        let n = 0;
        for (const [m, sc] of [...e.v]) if (sc >= min && sc <= max && e.v.delete(m)) n++;
        return n;
      }
      case 'LPUSH': {
        const e = of(a[0], 'l', true);
        for (const v of a.slice(1)) e.v.unshift(v);
        return e.v.length;
      }
      case 'LTRIM': {
        const e = of(a[0], 'l');
        if (e) e.v = e.v.slice(idx(Number(a[1]), e.v.length), idx(Number(a[2]), e.v.length) + 1);
        return 'OK';
      }
      case 'LRANGE': {
        const e = of(a[0], 'l');
        if (!e) return [];
        return e.v.slice(idx(Number(a[1]), e.v.length), idx(Number(a[2]), e.v.length) + 1);
      }
      case 'LLEN':
        return of(a[0], 'l')?.v.length ?? 0;
      case 'LREM': {
        const e = of(a[0], 'l');
        if (!e) return 0;
        const max = Math.abs(Number(a[1])) || Infinity;
        const val = String(a[2]);
        let removed = 0;
        e.v = e.v.filter((x) => {
          if (removed < max && x === val) { removed++; return false; }
          return true;
        });
        return removed;
      }
      default:
        throw new Error(`Comando no soportado: ${op}`);
    }
  }

  return {
    kind: file ? 'archivo' : 'memoria',
    async cmd(...args) {
      return exec(args);
    },
    async pipeline(cmds) {
      return cmds.map((c) => exec(c));
    },
    async once(key, cmds) {
      // Sin await entre comandos: tiene la misma exclusión que el script de Redis.
      return once(key, cmds);
    },
    exec,
    flush,
  };
}
