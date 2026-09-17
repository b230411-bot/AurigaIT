const express = require("express");
const prisma = require("./db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const now = req.body?.now ? new Date(req.body.now) : new Date();

    if (isNaN(now.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const expired = await prisma.batch.updateMany({
      where: {
        expiryDate: { lt: now },
        quantity: { gt: 0 },
        status: { not: "QUARANTINED" },
      },
      data: {
        status: "QUARANTINED",
        quarantinedAt: now,
      },
    });

    const expiring = await prisma.batch.updateMany({
      where: {
        expiryDate: {
          gte: now,
          lte: sevenDaysLater,
        },
        quantity: { gt: 0 },
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRING_SOON",
      },
    });

    res.json({
      message: "Clock job completed",
      expiredQuarantined: expired.count,
      expiringSoon: expiring.count,
    });
  } catch (error) {
    console.error("CLOCK ERROR:", error);
    res.status(500).json({
      message: "Clock job failed",
      error: error.message,
    });
  }
});

module.exports = router;