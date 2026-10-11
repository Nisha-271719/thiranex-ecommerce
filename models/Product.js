const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    image: { type: String, default: "https://via.placeholder.com/600x400?text=Product" },
    stock: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
