const clockRoutes = require("./clock");
const importRoutes = require("./import");
const reorderRoutes = require("./reorder");
const express = require("express");
const cors = require("cors");

const app = express();
app.use("/clock", clockRoutes);
app.use("/import", importRoutes);
app.use("/", reorderRoutes);
const medicineRoutes = require("./medicine");
const authRoutes = require("./auth");

app.use(cors());
app.use(express.json());

app.use("/api/medicines", medicineRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Pharmacy Inventory API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});