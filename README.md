# kofi-webhooks

Typed receiver for [Ko-fi webhooks](https://ko-fi.com/manage/webhooks). Verifies the token, parses the payload, dispatches typed events. No runtime dependencies.

```ts
import { createKofiWebhook } from 'kofi-webhooks';

const kofi = createKofiWebhook({ verificationToken: process.env.KOFI_TOKEN! });

kofi.on('donation', (e) => console.log(`${e.from_name} gave ${e.amount} ${e.currency}`));
kofi.on('subscription', (e) => console.log(e.tier_name, e.is_first_subscription_payment));
kofi.on('shopOrder', (e) => console.log(e.shop_items));
```

## Express

```ts
app.post('/kofi', kofi.middleware()); // works with or without express.urlencoded()
```

## Fetch-style runtimes (Next.js, Hono, Workers, Bun, Deno)

```ts
export const POST = kofi.fetchHandler; // Next.js route handler
```

Invalid tokens get `401`, malformed bodies `400`. Use `kofi.handle(body)` directly for any other framework.
