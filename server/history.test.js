import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMemoryKv } from './kv/memory.js';
import { createStore } from './store.js';

test('los recuerdos y los gestos siguen guardados al crecer el jardín y reiniciar', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'huellita-historial-'));
  const file = join(dir, 'kv.json');
  const kv = createMemoryKv({ file });
  let reopened;
  try {
    const store = createStore(kv);
    const { memorial, editToken } = await store.create({ name: 'Luz', species: 'perro' }, null, 'Familia');
    const id = memorial.id;
    let firstPage;
    // Superar los límites anteriores no debe borrar las primeras páginas, palabras ni regalos.
    for (let i = 0; i < 201; i++) {
      const p = await store.addDiary(id, editToken, { text: `Recuerdo ${i}` });
      firstPage ||= p;
    }
    await store.heartDiary(id, firstPage.id, 'corazon');
    for (let i = 0; i < 501; i++) {
      await store.sign(id, { name: 'Familia', text: `Palabras ${i}` }, { sid: `firma-${i}` });
    }
    for (let i = 0; i < 51; i++) {
      await store.gift(id, { sid: `regalo-${i}`, visitor: `Visita ${i}` }, '🎾 Una pelota');
    }
    await store.hug(id, { sid: 'abrazo', visitor: 'Familia' });
    for (const board of ['jar', 'comfort']) {
      for (let i = 0; i < 301; i++) await store.boardAdd(board, `Gracias ${i}`, 'Familia');
    }

    kv.flush();
    reopened = createMemoryKv({ file });
    const after = createStore(reopened);
    for (const [key, count, field, first] of [
      [`hu:dy:${id}`, 201, 'text', 'Recuerdo 0'],
      [`hu:gb:${id}`, 501, 'text', 'Palabras 0'],
      [`hu:gf:${id}`, 51, 'who', 'Visita 0'],
      ['hu:jar', 301, 'text', 'Gracias 0'],
      ['hu:comfort', 301, 'text', 'Gracias 0'],
    ]) {
      assert.equal(await reopened.cmd('LLEN', key), count, `${key}: se conserva todo`);
      const [oldest] = await reopened.cmd('LRANGE', key, '-1', '-1');
      assert.equal(JSON.parse(oldest)[field], first, `${key}: el primer recuerdo sigue ahí`);
    }
    const [firstEvent] = await reopened.cmd('LRANGE', 'hu:ev', '-1', '-1');
    assert.equal(JSON.parse(firstEvent).type, 'created', 'la primera actividad no desaparece');
    const history = (await reopened.cmd('LRANGE', 'hu:ev', '0', '-1')).map(JSON.parse);
    assert.ok(history.some((e) => e.type === 'hug'), 'el abrazo también queda en el historial');
    assert.equal(await reopened.cmd('HGET', `hu:dh:${id}`, firstPage.id), '1');
    assert.equal((await after.owner(id, editToken)).error, undefined, 'la familia conserva el acceso');

    // Las respuestas siguen siendo pequeñas aunque la base conserve el historial completo.
    const full = await after.get(id);
    assert.equal(full.diaryCount, 201);
    assert.equal(full.guestbookCount, 501);
    assert.equal(full.gifts, 51);
    assert.equal(full.diary.length, 50);
    assert.equal(full.guestbook.length, 100);
    assert.equal(full.giftList.length, 30);
    assert.equal((await after.events(0)).events.length, 20);
    for (const board of ['jar', 'comfort']) {
      const b = await after.board(board);
      assert.equal(b.count, 301);
      assert.equal(b.notes.length, 60);
    }
  } finally {
    kv.flush();
    reopened?.flush();
    rmSync(dir, { recursive: true, force: true });
  }
});
