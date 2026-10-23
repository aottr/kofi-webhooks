import { KofiWebhookError, parseEvent } from './parse.js';
import type { KofiEvent, KofiEventMap } from './types.js';

export interface KofiWebhookOptions {
  /** The verification token from Ko-fi → Settings → API. Keep it secret. */
  verificationToken: string;
}

type Listener<T> = (event: T) => void | Promise<void>;

export class KofiWebhook {
  private listeners: Partial<Record<keyof KofiEventMap, Listener<KofiEvent>[]>> = {};

  constructor(private readonly options: KofiWebhookOptions) {
    if (!options.verificationToken) throw new Error('verificationToken is required');
  }

  on<K extends keyof KofiEventMap>(name: K, listener: Listener<KofiEventMap[K]>): this {
    const list: Listener<KofiEvent>[] = (this.listeners[name] ??= []);
    list.push(listener as Listener<KofiEvent>);
    return this;
  }

  /** Verify and dispatch a raw body (string, `{ data }` object, or parsed payload). */
  async handle(body: unknown): Promise<KofiEvent> {
    const event = parseEvent(body, this.options.verificationToken);
    const specific: keyof KofiEventMap =
      event.type === 'Donation' ? 'donation'
      : event.type === 'Subscription' ? 'subscription'
      : event.type === 'Shop Order' ? 'shopOrder'
      : 'commission';
    for (const name of [specific, 'event'] as const) {
      for (const fn of this.listeners[name] ?? []) await fn(event);
    }
    return event;
  }

  /** Web-standard handler: `(Request) => Response`. Works with Hono, Next.js route handlers, Workers, Bun, Deno. */
  fetchHandler = async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    return this.respond(async () => this.handle(await request.text()));
  };

  /**
   * Express/Connect-style middleware. Works with `express.urlencoded()` already applied
   * (reads `req.body`), or with no body parser (reads the stream itself).
   */
  middleware = () => async (req: NodeLikeRequest, res: NodeLikeResponse, next?: (err?: unknown) => void): Promise<void> => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end('Method Not Allowed');
      return;
    }
    try {
      const body = req.body ?? (await readStream(req));
      await this.handle(body);
      res.statusCode = 200;
      res.end('OK');
    } catch (err) {
      if (err instanceof KofiWebhookError) {
        res.statusCode = err.status;
        res.end(err.message);
      } else if (next) next(err);
      else {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
  };

  private async respond(run: () => Promise<unknown>): Promise<Response> {
    try {
      await run();
      return new Response('OK', { status: 200 });
    } catch (err) {
      if (err instanceof KofiWebhookError) return new Response(err.message, { status: err.status });
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

export interface NodeLikeRequest extends AsyncIterable<Uint8Array | string> {
  method?: string;
  body?: unknown;
}

export interface NodeLikeResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(chunk?: string): unknown;
}

async function readStream(req: NodeLikeRequest): Promise<string> {
  const decoder = new TextDecoder();
  let out = '';
  for await (const chunk of req) out += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
  return out + decoder.decode();
}

export function createKofiWebhook(options: KofiWebhookOptions): KofiWebhook {
  return new KofiWebhook(options);
}
