import type { KofiEvent } from './types.js';

export class KofiWebhookError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401,
  ) {
    super(message);
    this.name = 'KofiWebhookError';
  }
}

const EVENT_TYPES = new Set(['Donation', 'Subscription', 'Shop Order', 'Commission']);

/**
 * Parse a raw Ko-fi request body. Ko-fi sends `application/x-www-form-urlencoded`
 * with a single `data` field holding the JSON payload. A bare JSON string and an
 * already-parsed form object (`{ data: "..." }`) are accepted too.
 */
export function parseBody(body: unknown): unknown {
  let json: unknown;
  if (typeof body === 'string') {
    const trimmed = body.trimStart();
    json = trimmed.startsWith('{') ? trimmed : new URLSearchParams(body).get('data');
  } else if (body && typeof body === 'object' && 'data' in body) {
    json = (body as { data: unknown }).data;
  } else {
    json = body;
  }

  if (typeof json === 'string') {
    try {
      return JSON.parse(json);
    } catch {
      throw new KofiWebhookError('Malformed JSON in webhook payload', 400);
    }
  }
  if (json && typeof json === 'object') return json;
  throw new KofiWebhookError('Missing webhook payload', 400);
}

/** Parse and verify a webhook body, returning the typed event. Throws {@link KofiWebhookError}. */
export function parseEvent(body: unknown, verificationToken: string): KofiEvent {
  const payload = parseBody(body) as Partial<KofiEvent>;
  if (typeof payload.verification_token !== 'string' || payload.verification_token !== verificationToken) {
    throw new KofiWebhookError('Invalid verification token', 401);
  }
  if (typeof payload.type !== 'string' || !EVENT_TYPES.has(payload.type)) {
    throw new KofiWebhookError(`Unknown event type: ${String(payload.type)}`, 400);
  }
  return payload as KofiEvent;
}
