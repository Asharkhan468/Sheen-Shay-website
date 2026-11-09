# Sheen & Shay Creates

A rose-and-cream storefront for luxury gifts and keepsakes, with a responsive catalog, cart and checkout, private order tracking, and a server-backed administration portal.

## Requirements

- Node.js 20 or newer
- MongoDB (MongoDB Atlas is suitable for production; a local MongoDB server can be used for development)
- Cloudinary account credentials only if product image uploads are needed

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env`. Set `MONGODB_URI`, a unique `SESSION_SECRET` of at least 32 characters, and the admin account email and password. Use a password of at least 14 characters. Keep `.env` private; it is excluded from Git.

3. Seed the initial product categories and catalog, then create the first administrator:

   ```sh
   npm run seed:catalog
   npm run seed:admin
   ```

   Catalog seeding creates the original six products only when the database has no products. It will not overwrite products already managed in the database. Administrator seeding never resets an existing account.

4. Start the server:

   ```sh
   npm start
   ```

5. Open `http://localhost:3000`. Sign in to the management portal at `http://localhost:3000/admin/login`.

The storefront and admin portal must be served by Node; opening `index.html` directly with a `file://` URL will not connect to the APIs. For development, `npm run dev` restarts the server when source files change.

## Storefront and administration

- The storefront retains its rose-and-cream identity and responsive catalog while adding gifting inspiration, occasion links, customization guidance, policy FAQs, and a closing collection invitation.
- The slow testimonial marquee remains a clearly labeled placeholder until real, permission-approved customer reviews are available. It pauses on hover/focus and honors reduced-motion preferences.
- The MongoDB catalog is the source of truth for products, categories, prices, sales, product images, and optional inventory counts.
- Checkout sends product IDs and quantities only. The server reads current product prices, checks availability, applies the existing `SHEEN10` promotion and PKR 250 / PKR 6,000 shipping rules, and records an order snapshot. A retry key prevents a repeated checkout request from creating another order.
- Customers can look up an order using its order number and the phone number provided at checkout. Private contact and delivery details are not returned by the tracking API.
- The admin portal provides product and category management, image URL entry or optional Cloudinary uploads, order search and filters, payment and fulfillment status updates, carrier tracking details, internal notes, CSV export, and order archiving.
- Admin access uses server-side sessions, password hashing, login rate limits, CSRF tokens, and a change-password form. There is no public account registration or default password.
- Cloudinary configuration is optional. Without it, administrators can use public HTTPS image URLs; upload requests return an explicit setup error.
- Customer email is optional. No email, SMS, or payment-gateway integration is configured; payment statuses must be updated by an administrator.

## Existing browser data

The previous static site kept products and orders in each browser's `localStorage`. The new server does not trust or automatically import those records: browser-only product edits are not shared across devices, and client-created order totals are not verified historical sales. The old `sheen_products` and `sheen_orders` values are left untouched in the browser, and the cart remains browser-local. The initial database catalog uses the original six product records and IDs so existing carts for those products continue to resolve. Add or correct any other inventory in the authenticated admin portal.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `SESSION_SECRET` | Yes | At least 32 characters; used to sign administrator sessions |
| `CLIENT_ORIGIN` | Recommended | Exact storefront origin for browser-origin checks and optional cross-origin API access |
| `ADMIN_EMAIL` | For first admin seed | Initial administrator email |
| `ADMIN_PASSWORD` | For first admin seed | Unique password, 14–128 characters |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret; never expose it in browser code |
| `PORT` | Optional | HTTP port; defaults to `3000` |
| `NODE_ENV` | Optional | Set to `production` when deployed with HTTPS |

Set all three Cloudinary variables together or leave them blank. In production, set `CLIENT_ORIGIN` to the canonical HTTPS origin, use a long random session secret, configure HTTPS and a trusted reverse proxy, and restrict MongoDB network access to the application. Do not deploy with development credentials.

## API and implementation notes

- Public storefront endpoints: `GET /api/store/products`, `GET /api/store/categories`, `POST /api/store/orders`, and `POST /api/store/orders/track`.
- All `/api/admin/*` data endpoints require an authenticated administrator session. Mutating admin requests also require a CSRF token returned by the auth session endpoint.
- `/admin` redirects unauthenticated visitors to `/admin/login`; `/health` reports whether MongoDB is connected.
- Product and order records are retained in MongoDB. Products are archived rather than hard-deleted; orders can be archived without removing their snapshots.
- The testimonial marquee intentionally contains clearly marked placeholders. Replace them only with genuine feedback approved for publication.
- Preparation, shipping, returns, and customization policies should be confirmed by the business before replacing the editable FAQ placeholders. The WhatsApp contact number in the storefront is also a placeholder and must be replaced before launch.

## Tests

Run unit and API integration tests with:

```sh
npm test
```

The integration test starts a temporary MongoDB instance and exercises authentication, CSRF and origin checks, server-calculated checkout totals, idempotent ordering, private order tracking, inventory restoration on cancellation, password changes, and logout. It does not need production MongoDB or Cloudinary credentials.
