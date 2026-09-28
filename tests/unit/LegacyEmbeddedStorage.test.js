const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const hostPath = path.join(__dirname, '../../apps/legacy/HUB_7_v3-2.html');
const clientPath = path.join(__dirname, '../../frontend/services/hub-client.js');
const hostHtml = fs.readFileSync(hostPath, 'utf8');
const clientSource = fs.readFileSync(clientPath, 'utf8');
const embeddedMatch = hostHtml.match(
  /const EMBEDDED_APPS\s*=\s*(\{[\s\S]*?\})\s*;\s*\/\/\s*─/
);

if (!embeddedMatch) throw new Error('Embedded app map not found in the legacy HUB host.');

const embeddedApps = vm.runInNewContext(`(${embeddedMatch[1]})`);

function decodeApp(filename) {
  const encoded = embeddedApps[filename];
  if (!encoded) throw new Error(`Embedded app "${filename}" not found.`);
  return Buffer.from(encoded, 'base64').toString('utf8');
}

function createStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      key = String(key);
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    clear() {
      values.clear();
    },
    values,
  };
}

describe('legacy embedded app storage migration', () => {
  test('contains all nine catalog apps and optional Cartão Monitor', () => {
    expect(Object.keys(embeddedApps).sort()).toEqual(
      [
        'cartao-monitor.html',
        'checklist-5s-fahrwerk.html',
        'fahrwerk-polivalencia.html',
        'lip-monitor.html',
        'rotativa-fahrwerk.html',
        'vcp-monitor.html',
        'vtp-fahrwerk.html',
        'vw-monitor-v14.html',
        'vw-monitor.html',
        'vw_ausencias_ia.html',
      ].sort()
    );
  });

  test.each(Object.keys(embeddedApps))('%s uses HUB.storage, not raw localStorage calls', (filename) => {
    const html = decodeApp(filename);
    expect(html).not.toMatch(/\blocalStorage\s*(?:\.|\[)/);
    expect(html).toContain('</html>');
  });

  test('preserves existing application storage keys', () => {
    const expectedKeys = {
      'vw_ausencias_ia.html': ["setItem('vw_atrasados'", "getItem('vw_q_'"],
      'lip-monitor.html': ["_lsg('lip_st'"],
      'vcp-monitor.html': ["const KEY = 'vcp_v5'"],
      'vtp-fahrwerk.html': ["setItem('vtp_registros'", "setItem('vtp_operacoes'"],
      'vw-monitor-v14.html': ["setItem('vw_d'", "setItem('vw_w'", "setItem('vw_c'"],
      'cartao-monitor.html': ['getItem("vwm5"', 'setItem("vwm5"'],
      'vw-monitor.html': ["getItem('vw_c')", "getItem('vw_w')", "getItem('vw_obj')", "getItem('vw_d')"],
      'rotativa-fahrwerk.html': ['const DB_KEY="fahrwerk_db_v9"'],
    };

    for (const [filename, snippets] of Object.entries(expectedKeys)) {
      const html = decodeApp(filename);
      expect(html).toContain('HUB.storage.');
      for (const snippet of snippets) expect(html).toContain(snippet);
    }
  });

  test('leaves Versatilidade IndexedDB persistence in place', () => {
    const html = decodeApp('fahrwerk-polivalencia.html');
    expect(html).toContain("indexedDB.open('fahrwerk_poliv2'");
    expect(html).not.toMatch(/\blocalStorage\s*(?:\.|\[)/);
  });

  test('loads the shared client in the host and injects it before both embedded and uploaded apps', () => {
    expect(hostHtml).toContain('<script src="../../frontend/services/hub-client.js"></script>');
    expect(hostHtml).toContain('HUB.createFrameBootstrap()');
    expect(hostHtml).toContain('var html=injectHubClient(b64(b64str));');
    expect(hostHtml).toContain('uploadHtml=injectHubClient(uploadHtml);');
    expect(hostHtml).toContain('HUB.storage.getItem');
    expect(hostHtml).toContain('HUB.storage.getItem(k)');
    expect(hostHtml).toContain('HUB.storage.setItem(k');
    expect(hostHtml).not.toMatch(/\blocalStorage\s*(?:\.|\[)/);
  });

  test('HUB.storage is synchronous and delegates unchanged keys to native localStorage', () => {
    const hostWindow = {
      location: { origin: 'https://hub.example.test' },
      parent: null,
      addEventListener() {},
    };
    hostWindow.parent = hostWindow;
    vm.runInNewContext(clientSource, { window: hostWindow });
    expect(hostWindow.HUB.getOperators).toBeUndefined();
    expect(hostWindow.HUB.createFrameBootstrap).toEqual(expect.any(Function));

    const frameStorage = createStorage();
    let storageMessages = 0;
    const frameWindow = {
      location: { origin: 'https://hub.example.test' },
      localStorage: frameStorage,
      parent: {
        postMessage() {
          storageMessages += 1;
        },
      },
      addEventListener() {},
    };
    vm.runInNewContext(hostWindow.HUB.createFrameBootstrap(), { window: frameWindow });

    expect(frameWindow.HUB.getOperators).toEqual(expect.any(Function));
    const existingKey = `vw_q_${new Date().toISOString().slice(0, 10)}`;
    const existingValue = JSON.stringify([{ id: 'saved-before-migration' }]);
    expect(frameWindow.HUB.storage.setItem(existingKey, existingValue)).toBeUndefined();
    expect(frameStorage.values.get(existingKey)).toBe(existingValue);
    expect(frameWindow.HUB.storage.getItem(existingKey)).toBe(existingValue);
    expect(frameWindow.HUB.storage.length).toBe(1);
    expect(frameWindow.HUB.storage.key(0)).toBe(existingKey);

    frameWindow.HUB.storage.removeItem(existingKey);
    expect(frameStorage.values.has(existingKey)).toBe(false);
    frameWindow.HUB.storage.setItem(existingKey, existingValue);
    frameWindow.HUB.storage.clear();
    expect(frameWindow.HUB.storage.length).toBe(0);
    expect(storageMessages).toBe(0);
  });
});
