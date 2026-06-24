import cors from "cors";
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import addressRoutes from "./routes/addresses.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import deliveryRoutes from "./routes/delivery.js";
import inventoryRoutes from "./routes/inventory.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import productRoutes from "./routes/products.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import userRoutes from "./routes/users.js";

const app = express();
const port = process.env.PORT || 4000;
const host = "0.0.0.0";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "water-app-server" }));
app.use("/admin", adminRoutes);
app.use("/delivery", deliveryRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/payments", paymentRoutes);
app.use("/addresses", addressRoutes);
app.use("/users", userRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || "Internal server error" });
});

app.listen(port, host, () => {
  console.log(`Server running on port ${port}`);
});
