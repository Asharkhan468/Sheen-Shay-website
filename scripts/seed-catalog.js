require("dotenv").config();

const mongoose = require("mongoose");
const { categories, products } = require("../src/defaults");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const { getConfig } = require("../src/config");

async function seedCatalog() {
  const config = getConfig();
  await mongoose.connect(config.mongodbUri);

  for (const category of categories) {
    await Category.updateOne(
      { slug: category.slug },
      { $setOnInsert: category },
      { upsert: true, runValidators: true },
    );
  }

  if ((await Product.countDocuments()) === 0) {
    for (const item of products) {
      await Product.create({
        _id: item.id,
        sku: item.sku,
        title: item.title,
        slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        category: item.category,
        description: item.description,
        price: item.price,
        saleEnabled: item.saleEnabled,
        salePrice: item.salePrice,
        images: [{ url: item.imageUrl, alt: item.title }],
        stockQuantity: null,
        stockStatus: item.stockStatus,
        rating: item.rating,
      });
    }
    console.log(`Seeded ${products.length} initial catalog products.`);
  } else {
    console.log("Catalog already contains products; no product records were changed.");
  }
}

seedCatalog()
  .catch((error) => {
    console.error("Catalog seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
