import { readEncryptedBytes } from './store';

const originalFetch = window.fetch.bind(window);

export function installDemoFetch(): void {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    const downloadMatch = url.match(/\/sends\/([^/?#]+)\/download/);
    if (downloadMatch) {
      const accessId = downloadMatch[1];
      const password = (init?.headers as Record<string, string>)?.['X-Send-Password'];

      try {
        const { data } = await readEncryptedBytes(accessId, password);
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(data);
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Length': String(data.byteLength) },
        });
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err.status) {
          return new Response(JSON.stringify({ message: (e as Error).message }), {
            status: err.status,
          });
        }
        throw e;
      }
    }

    return originalFetch(input, init);
  };
}
