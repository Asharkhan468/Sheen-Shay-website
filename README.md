# Sheen & Shay Creates — Website Package

A responsive, frontend-only gift shop for **Sheen & Shay Creates**, featuring a product catalog, custom hamper request form, cart and checkout, order tracking, and an admin dashboard.

## Project files

- `index.html` — Storefront, product catalog markup, custom gift builder, gifting information, FAQ, testimonial placeholders, order tracking, admin interface, and checkout/cart dialogs.
- `style.css` — Brand styling, responsive layouts, animations, accessibility preferences, and the testimonial marquee.
- `app.js` — Product catalog behavior, search and category filters, cart and checkout, custom WhatsApp requests, order tracking, and admin functionality.
- `README.md` — Setup, feature, and publishing notes.

## Run the website

1. Open `index.html` in a current desktop or mobile browser.
2. Internet access is recommended: Tailwind CSS and Google Sans are loaded from CDNs.

No build step or Node.js installation is required.

## Storefront features

- Responsive product catalog with search and category filters.
- Product quick view, listed gift-wrap choices, and add-to-cart or buy-now actions.
- Cart, checkout, order receipts, and customer order tracking.
- Custom hamper request form that opens a WhatsApp conversation with the request details.
- Admin tools for managing products, prices, images, stock, and orders.
- Local product and order data stored in the browser.

### Gifting experience

- An editorial section about thoughtful, personalized gifting.
- Occasion links for birthdays, anniversaries, Eid and festive moments, weddings and bridal showers, baby welcomes, and graduation or corporate gifting. These reflect the occasions present in the custom request form.
- A step-by-step explanation of the existing custom request and storefront ordering paths.
- A responsive FAQ covering personalization, customization, preparation, shipping, packaging, corporate requests, custom orders, returns, damaged items, and contact.
- A closing invitation linking back to the catalog and custom gift builder.

### Testimonials and review carousel

- A continuously moving testimonial marquee with a slow 66-second loop.
- Approximately three cards are visible on desktop, two on tablet, and one on mobile.
- Hovering or keyboard focus pauses the animation.
- When reduced motion is enabled, animation stops and the cards become a horizontally scrollable row.
- The displayed cards are **editable placeholders, not real reviews**. Replace them only with genuine customer feedback and obtain permission before publishing identifying details. Do not present placeholder content as a customer endorsement.

## Product prices and sales

Each product has its own pricing settings in the admin product form:

1. Enter the **Regular / Original Price**.
2. Leave **Put this product on sale** unchecked if the product is not discounted; the storefront displays its regular price.
3. Check **Put this product on sale** to apply a discount to that product only.
4. Enter a **Discounted / Sale Price** lower than the regular price.
5. Save the product. The website calculates the discount percentage and displays the sale price with the original price crossed out.

Sales can be enabled or disabled for products independently. The active product price is used in the cart and checkout. Previously stored products with a valid original price remain supported.

## Before publishing

- Replace the WhatsApp placeholder number (`+92 300 0000000`) with the shop's real contact number. It appears in the custom request flow and contact links.
- Fill in the bracketed FAQ placeholders with confirmed business policies and details, including preparation estimates, delivery estimates, packaging scope, returns and exchanges, and how to report damaged or incorrect orders.
- Replace testimonial placeholders only with real reviews approved for publication.
- Confirm that displayed shipping prices, delivery coverage, promotional offers, and product details are current.
- Admin access in this frontend-only website is not secure authentication. Do not rely on it to protect sensitive business or customer information.

## Storage and deployment limitations

- Products, cart contents, and orders use browser `localStorage`; they are not automatically shared across browsers or devices.
- Order tracking only works with orders saved in the same browser.
- Cross-device inventory, customer order tracking, secure authentication, and centralized order management require a backend and database.
- Tailwind CSS and Google Sans are loaded externally, so an internet connection is recommended.
