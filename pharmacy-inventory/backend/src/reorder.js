const express = require("express");
const prisma = require("./db");

const router = express.Router();

// Set reorder threshold
router.post("/medicines/:id/threshold", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);
    const threshold = parseInt(req.body.threshold);

    if (isNaN(threshold) || threshold < 0) {
      return res.status(400).json({
        message: "Invalid threshold",
      });
    }

    const medicine = await prisma.medicine.update({
      where: { id: medicineId },
      data: {
        reorderThreshold: threshold,
      },
    });

    res.json({
      message: "Reorder threshold updated",
      medicineId: medicine.id,
      threshold: medicine.reorderThreshold,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to set threshold",
      error: error.message,
    });
  }
});

// Check stock and create reorder notification
router.post("/medicines/:id/check-reorder", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);

    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      include: { batches: true },
    });

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    const now = new Date();

    const sellableStock = medicine.batches
      .filter(
        (b) =>
          b.quantity > 0 &&
          b.expiryDate >= now &&
          b.status !== "QUARANTINED"
      )
      .reduce((sum, b) => sum + b.quantity, 0);

    let notificationCreated = false;

    if (
      medicine.reorderThreshold > 0 &&
      sellableStock < medicine.reorderThreshold
    ) {
      await prisma.outbox.create({
        data: {
          type: "REORDER_ALERT",
          payload: JSON.stringify({
            medicineId: medicine.id,
            medicineName: medicine.name,
            sellableStock,
            threshold: medicine.reorderThreshold,
          }),
        },
      });

      notificationCreated = true;
    }

    res.json({
      medicineId,
      medicineName: medicine.name,
      sellableStock,
      threshold: medicine.reorderThreshold,
      notificationCreated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Reorder check failed",
      error: error.message,
    });
  }
});

// Notification Service outbox
router.get("/outbox", async (req, res) => {
  try {
    const messages = await prisma.outbox.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json({
      count: messages.length,
      messages: messages.map((item) => ({
        id: item.id,
        type: item.type,
        payload: JSON.parse(item.payload),
        createdAt: item.createdAt,
        sent: item.sent,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch outbox",
      error: error.message,
    });
  }
});

module.exports = router;