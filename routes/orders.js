const router = require("express").Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const statuses = ["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

router.post("/", requireAuth, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      const quantity = Number(item.quantity);

      if (!product) return res.status(400).json({ message: "A product no longer exists" });
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      if (product.stock < quantity) {
        return res.status(400).json({ message: `${product.name} has only ${product.stock} left` });
      }

      totalAmount += product.price * quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity
      });
    }

    if (!shippingAddress?.fullName || !shippingAddress?.phone ||
        !shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.pincode) {
      return res.status(400).json({ message: "Complete shipping address is required" });
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: "Could not place order", error: error.message });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Could not fetch your orders" });
  }
});

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Could not fetch orders" });
  }
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!statuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch {
    res.status(500).json({ message: "Could not update order status" });
  }
});

module.exports = router;
