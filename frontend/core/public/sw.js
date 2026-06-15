/**
 * sE2EEnd download service worker — cross-browser streaming-to-disk.
 *
 * The page builds a fully-DECRYPTED stream (network → re-chunk → AES-GCM decrypt, see
 * src/lib/crypto.ts) and pumps it here over a MessageChannel with backpressure. We expose it
 * behind a magic same-origin URL (/stream-download/<id>) and answer the navigation with
 * `Content-Disposition: attachment`, so the browser's native download manager writes to disk at
 * the stream's pace — constant RAM, any file size.
 *
 * E2EE is preserved: the worker only ever sees plaintext that was already decrypted in the same
 * browser. Nothing extra crosses the network and the key never leaves the page.
 */

const STREAM_PREFIX = 'stream-download';

/** id -> { filename, port } pending downloads, consumed on first matching fetch. */
const pending = new Map();

self.addEventListener('install', () => {
  // Activate immediately so a freshly deployed worker isn't stuck waiting.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of already-open clients (and any iframe we navigate) right away.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'stream-download') return;

  const port = event.ports[0];
  pending.set(data.id, { filename: data.filename, port });

  // Reply with the URL the page should navigate (in a hidden iframe) to start the download.
  port?.postMessage({ url: `${self.registration.scope}${STREAM_PREFIX}/${data.id}` });
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const marker = `/${STREAM_PREFIX}/`;
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return; // not ours — let the request hit the network normally

  const id = url.pathname.slice(idx + marker.length);
  const entry = pending.get(id);
  if (!entry) return; // unknown / already consumed — fall through to a normal 404
  pending.delete(id);

  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeRFC5987(entry.filename)}`,
    'Cache-Control': 'no-store',
  });

  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const stream = buildPulledStream(entry.port, resolveDone);

  event.respondWith(new Response(stream, { headers }));
  event.waitUntil(done);
});

/**
 * A ReadableStream fed by the page over `port`, one chunk per pull. Returning a promise from
 * pull() (resolved only once the page answers) gives true backpressure: at most one chunk is
 * ever in flight, so the page decrypts no faster than the disk writes. `onDone` fires when the
 * stream terminates (used to release the waitUntil keepalive).
 */
function buildPulledStream(port, onDone) {
  let resolvePull = null;

  return new ReadableStream({
    start(controller) {
      port.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'data') {
          controller.enqueue(msg.chunk);
        } else if (msg.type === 'end') {
          controller.close();
          onDone();
        } else if (msg.type === 'abort') {
          controller.error(new Error('Upstream aborted'));
          onDone();
        }
        if (resolvePull) { const resolve = resolvePull; resolvePull = null; resolve(); }
      };
    },
    pull() {
      return new Promise((resolve) => {
        resolvePull = resolve;
        port.postMessage({ type: 'pull' });
      });
    },
    cancel() {
      port.postMessage({ type: 'cancel' });
      onDone();
    },
  });
}

/** Percent-encode a filename for the RFC 5987 `filename*=UTF-8''...` form. */
function encodeRFC5987(str) {
  return encodeURIComponent(str)
    .replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%(?:7C|60|5E)/g, (match) => String.fromCharCode(parseInt(match.slice(1), 16)));
}
