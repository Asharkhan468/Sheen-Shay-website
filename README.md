# Sheen & Shay Creates — Website Package

A responsive, frontend-only gift shop website for **Sheen & Shay Creates**.

## Files

- `index.html` — Complete website (HTML, styling, and JavaScript in one file).
- `README.md` — Setup instructions, feature notes, and a section for feedback/change requests.

## How to run

1. Extract the ZIP file.
2. Open `index.html` in Google Chrome, Microsoft Edge, or another modern browser.
3. Internet access is recommended because Google Sans and Tailwind CSS load from their CDNs.

No Node.js installation or build step is required.

## Main features

- Responsive storefront and product browsing.
- Product detail view when a product is selected.
- Cart and checkout flow.
- Admin product management: add, edit, and delete products.
- Product images can be uploaded from a device or added through an image URL.
- Individual pricing and sale settings for every product.
- Automatic discount percentage calculation and sale-price display.
- Order number generation and customer order tracking.
- Order status management in the admin area.
- Improved footer with social/contact icons.
- Google Sans typography.

## Product prices and sales

Each product has its own pricing settings in the admin product form:

1. Enter the **Regular / Original Price**.
2. Leave **Put this product on sale** unchecked if the product is not discounted. The storefront displays only the regular price.
3. Check **Put this product on sale** to apply a discount to that product only.
4. Enter the **Discounted / Sale Price**. It must be lower than the regular price.
5. Save the product. The website calculates the discount percentage and displays the sale price with the original price crossed out.

You can turn the sale off for one product without affecting any other product. The sale price is the amount used in the cart and checkout. Products already stored by an older version are supported; their previous discounted prices are retained when they have a valid original price.

## Important notes

- This version uses browser `localStorage`. Products and orders are saved in the browser where the website is being used; they are not automatically shared between different devices or browsers.
- Order tracking works with orders saved in that same browser. For real customer tracking across devices, the site will need a backend/database and hosting setup.
- The WhatsApp contact number in the HTML is currently a placeholder (`+92 300 0000000`). Replace it with the shop's actual WhatsApp number before publishing.
- Admin access in a frontend-only website is not secure authentication. Do not store sensitive customer or business data in this version.

## Friend's feedback — requested changes

> **Please fill in this section.** Describe what you want changed, added, removed, or fixed. Be as specific as possible. You can add screenshots or examples separately and mention their filenames here.

### 1. Changes to make

Write the requested changes here:

- [ ] Change 1:
- [ ] Change 2:
- [ ] Change 3:
- [ ] Change 4:

### 2. Problems / bugs noticed

For each issue, mention what you clicked, what happened, and what you expected to happen.

- **Problem:**
  - Steps to reproduce:
  - Expected result:
  - Actual result:

### 3. Design / UI feedback

- Sections or pages to improve:
- Colors / fonts / layout preferences:
- Example website or screenshot (if any):

### 4. Product, pricing, cart, checkout, and tracking feedback

- Product page changes:
- Regular/original price or sale-price changes:
- Cart / checkout changes:
- Order tracking changes:
- Admin panel changes:

### 5. Priority

Mark each request:

- [ ] High — must be fixed first
- [ ] Medium — important improvement
- [ ] Low — optional enhancement

### 6. Extra notes

Add any other ideas or instructions here:


---

## Sending feedback

Save this README after filling in the feedback section, then send the completed README (and any screenshots) back with the ZIP. Please do not edit the website code unless you specifically intend to; write requested changes in the feedback section above.
