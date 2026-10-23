import { describe, expect, it, vi } from 'vitest';
import { createKofiWebhook, KofiWebhookError } from '../src/index.js';

const TOKEN = 'secret-token';
const donation = {
  verification_token: TOKEN,
  message_id: 'abc',
  timestamp: '2026-01-01T00:00:00Z',
  type: 'Donation',
  is_public: true,
  from_name: 'Jo',
  message: 'Thanks!',
  amount: '3.00',
  url: 'https://ko-fi.com/Home/CoffeeShop?txid=1',
  email: 'jo@example.com',
  currency: 'USD',
  is_subscription_payment: false,
  is_first_subscription_payment: false,
  kofi_transaction_id: 'tx1',
  discord_username: 'Jo#4105',
  discord_userid: '012345678901234567',
  shop_items: null,
  tier_name: null,
  shipping: null,
};
const form = (p: object) => new URLSearchParams({ data: JSON.stringify(p) }).toString();

describe('KofiWebhook', () => {
  it('dispatches donations and generic events', async () => {
    const hook = createKofiWebhook({ verificationToken: TOKEN });
    const onDonation = vi.fn();
    const onEvent = vi.fn();
    hook.on('donation', onDonation).on('event', onEvent);
    await hook.handle(form(donation));
    expect(onDonation).toHaveBeenCalledOnce();
    expect(onDonation.mock.calls[0]![0].from_name).toBe('Jo');
    expect(onDonation.mock.calls[0]![0].discord_userid).toBe('012345678901234567');
    expect(onEvent).toHaveBeenCalledOnce();
  });

  it('rejects a bad token with 401', async () => {
    const hook = createKofiWebhook({ verificationToken: TOKEN });
    await expect(hook.handle(form({ ...donation, verification_token: 'nope' }))).rejects.toMatchObject({ status: 401 });
  });

  it('rejects malformed bodies with 400', async () => {
    const hook = createKofiWebhook({ verificationToken: TOKEN });
    await expect(hook.handle('data=%7Bnot-json')).rejects.toBeInstanceOf(KofiWebhookError);
    await expect(hook.handle('')).rejects.toMatchObject({ status: 400 });
  });

  it('works as a fetch handler', async () => {
    const hook = createKofiWebhook({ verificationToken: TOKEN });
    const ok = await hook.fetchHandler(new Request('http://x/', { method: 'POST', body: form(donation) }));
    expect(ok.status).toBe(200);
    const bad = await hook.fetchHandler(new Request('http://x/', { method: 'POST', body: form({ ...donation, verification_token: 'x' }) }));
    expect(bad.status).toBe(401);
    expect((await hook.fetchHandler(new Request('http://x/'))).status).toBe(405);
  });

  it('accepts a pre-parsed express body', async () => {
    const hook = createKofiWebhook({ verificationToken: TOKEN });
    const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
    await hook.middleware()({ method: 'POST', body: { data: JSON.stringify(donation) }, [Symbol.asyncIterator]: async function* () {} }, res);
    expect(res.statusCode).toBe(200);
  });
});
