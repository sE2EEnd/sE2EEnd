/**
 * Cross-browser streaming download via a same-origin service worker.
 *
 * The page hands a decrypted stream to /sw.js (see public/sw.js), which serves it as an
 * `attachment` so the browser writes it to disk at the stream's pace — constant RAM, any size.
 * Replaces the old "buffer the whole file in a Blob" path that OOM'd Firefox on large downloads.
 */

const SW_URL = '/sw.js';

let registration: Promise<ServiceWorkerRegistration> | null = null;

/** Register the streaming service worker. */
export function registerStreamingServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  if (!('serviceWorker' in navigator)) return null;
  if (!registration) {
    registration = navigator.serviceWorker.register(SW_URL, { scope: '/' });
  }
  return registration;
}

/**
 * Whether this browser can stream a download to disk: needs a service worker, a secure context
 * (HTTPS/localhost) and the Streams API. Covers Chrome/Edge, Firefox and Safari; everything else
 * falls back to the in-memory path with a size guard.
 */
export function supportsServiceWorkerStreaming(): boolean {
  const checks = {
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    secureContext: typeof window !== 'undefined' && window.isSecureContext,
    readableStream: typeof ReadableStream !== 'undefined',
  };
  const ok = Object.values(checks).every(Boolean);
  if (!ok) console.warn('[streamDownload] streaming unavailable, falling back to in-memory:', checks);
  return ok;
}

/**
 * Stream `stream` to disk as `filename`. Resolves once the whole stream has been pumped to the
 * service worker (i.e. fully decrypted and handed to the browser's download manager). The chunks
 * flow at the pace the download manager pulls them, keeping memory bounded to ~one chunk.
 */
export async function streamToDisk(stream: ReadableStream<Uint8Array>, filename: string): Promise<void> {
  await registerStreamingServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  const sw = reg.active;
  if (!sw) throw new Error('Service worker is not active');

  const id = crypto.randomUUID();
  const channel = new MessageChannel();
  const port = channel.port1;
  const reader = stream.getReader();
  const iframeRef: { current: HTMLIFrameElement | null } = { current: null };

  let resolveUrl: (url: string) => void;
  const urlReady = new Promise<string>((resolve) => { resolveUrl = resolve; });

  // Pumping completes when the worker has consumed the whole stream (or it errors/cancels).
  try {
    await new Promise<void>((resolve, reject) => {
      port.onmessage = async (event) => {
        const msg = event.data;
        if (msg?.url) { resolveUrl(msg.url); return; }

        if (msg?.type === 'pull') {
          try {
            const { done, value } = await reader.read();
            if (done) {
              port.postMessage({ type: 'end' });
              resolve();
            } else {
              // Transfer the chunk's buffer for a zero-copy handoff; each chunk owns its buffer.
              port.postMessage({ type: 'data', chunk: value }, [value.buffer]);
            }
          } catch (err) {
            port.postMessage({ type: 'abort' });
            reject(err);
          }
        } else if (msg?.type === 'cancel') {
          // User cancelled the native download — stop reading and tear down cleanly.
          reader.cancel().catch(() => {});
          resolve();
        }
      };

      // Kick off the worker: it stores the port, replies with the magic URL, then pulls via it.
      sw.postMessage({ type: 'stream-download', id, filename }, [channel.port2]);
      urlReady.then((url) => { iframeRef.current = appendHiddenIframe(url); }).catch(reject);
    });
  } finally {
    // The SW-served download is tied to this iframe client: removing it early truncates the
    // file. So keep it alive for the WHOLE transfer and only tear it down once pumping is done.
    iframeRef.current?.remove();
    port.close();
  }
}

function appendHiddenIframe(url: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.src = url;
  document.body.appendChild(iframe);
  return iframe;
}
