require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Product = require("../models/Product");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";

  const hashed = await bcrypt.hash(password, 10);
  const admin = await User.findOneAndUpdate(
    { email },
    { name: "Administrator", email, password: hashed, role: "admin" },
    { upsert: true, new: true }
  );

  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      {
        name: "Smart Watch",
        description: "Fitness tracking smart watch with notifications.",
        price: 2499,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
        stock: 20
      },
      {
        name: "Casual Backpack",
        description: "Water-resistant everyday backpack.",
        price: 1299,
        category: "Fashion",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
        stock: 25
      },
      {
        name: "Sports Shoes",
        description: "Comfortable lightweight shoes for daily activity.",
        price: 1899,
        category: "Footwear",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        stock: 15
      },
      {
        name: "Wireless Headphones",
        description: "Bluetooth headphones with long battery life.",
        price: 2199,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
        stock: 18
      }
    ]);
  }

  console.log("Admin ready:", admin.email);
  console.log("Password:", password);
  console.log("Seed complete.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
