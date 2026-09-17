const express = require("express");
const prisma = require("./db");

const router = express.Router();

// GET medicines
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      page = "1",
      limit = "10",
      sort = "name",
      order = "asc",
    } = req.query;

    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const allowedSortFields = ["name", "createdAt"];
    const sortField = allowedSortFields.includes(sort) ? sort : "name";
    const sortOrder = order === "desc" ? "desc" : "asc";

    const where = search
      ? {
          name: {
            contains: search,
          },
        }
      : {};

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: {
          [sortField]: sortOrder,
        },
        include: {
          batches: true,
        },
      }),
      prisma.medicine.count({ where }),
    ]);

    const now = new Date();

    const data = medicines.map((medicine) => {
      const validBatches = medicine.batches.filter(
        (batch) =>
          new Date(batch.expiryDate) >= now && batch.quantity > 0
      );

      const sellableStock = validBatches.reduce(
        (sum, batch) => sum + batch.quantity,
        0
      );

      return {
        id: medicine.id,
        name: medicine.name,
        category: medicine.category,
        description: medicine.description,
        sellableStock,
        batches: medicine.batches,
      };
    });

    res.json({
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("MEDICINE ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch medicines",
      error: error.message,
    });
  }
});

// POST medicine
router.post("/", async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Medicine name is required",
      });
    }

    const medicine = await prisma.medicine.create({
      data: {
        name,
        category: category || null,
        description: description || null,
      },
    });

    res.status(201).json(medicine);
  } catch (error) {
    console.error("CREATE MEDICINE ERROR:", error);

    res.status(500).json({
      message: "Failed to create medicine",
      error: error.message,
    });
  }
});

// POST batch
router.post("/:id/batches", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);

    const {
      batchNumber,
      expiryDate,
      quantity,
      price,
    } = req.body;

    if (!batchNumber || !expiryDate || quantity == null || price == null) {
      return res.status(400).json({
        message:
          "batchNumber, expiryDate, quantity and price are required",
      });
    }

    const medicine = await prisma.medicine.findUnique({
      where: {
        id: medicineId,
      },
    });

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    const batch = await prisma.batch.create({
      data: {
        batchNumber,
        expiryDate: new Date(expiryDate),
        quantity: parseInt(quantity),
        price: parseFloat(price),
        medicineId,
      },
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error("CREATE BATCH ERROR:", error);

    res.status(500).json({
      message: "Failed to add batch",
      error: error.message,
    });
  }
});
// POST dispense medicine using FEFO
router.post("/:id/dispense", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);
    const quantityToDispense = parseInt(req.body.quantity);

    if (!quantityToDispense || quantityToDispense <= 0) {
      return res.status(400).json({
        message: "Valid quantity is required",
      });
    }

    const now = new Date();

    // Get only valid, non-expired batches
    // Earliest expiry first = FEFO
    const batches = await prisma.batch.findMany({
      where: {
        medicineId,
        quantity: {
          gt: 0,
        },
        expiryDate: {
          gte: now,
        },
      },
      orderBy: {
        expiryDate: "asc",
      },
    });

    const availableStock = batches.reduce(
      (sum, batch) => sum + batch.quantity,
      0
    );

    if (availableStock < quantityToDispense) {
      return res.status(400).json({
        message: "Insufficient sellable stock",
        availableStock,
      });
    }

    let remaining = quantityToDispense;
    const dispensed = [];

    // FEFO: consume earliest-expiring batch first
    for (const batch of batches) {
      if (remaining <= 0) break;

      const amount = Math.min(batch.quantity, remaining);

      await prisma.batch.update({
        where: {
          id: batch.id,
        },
        data: {
          quantity: {
            decrement: amount,
          },
        },
      });

      dispensed.push({
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: amount,
      });

      remaining -= amount;
    }

    res.json({
      message: "Medicine dispensed successfully",
      requestedQuantity: quantityToDispense,
      dispensed,
      remainingStock: availableStock - quantityToDispense,
    });
  } catch (error) {
    console.error("DISPENSE ERROR:", error);

    res.status(500).json({
      message: "Failed to dispense medicine",
      error: error.message,
    });
  }
});
// EXPIRY ALERTS
router.get("/alerts/expiring", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const now = new Date();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const batches = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        medicine: true,
      },
      orderBy: {
        expiryDate: "asc",
      },
    });

    res.json({
      days,
      count: batches.length,
      alerts: batches.map((batch) => ({
        medicineId: batch.medicineId,
        medicineName: batch.medicine.name,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: batch.quantity,
      })),
    });
  } catch (error) {
    console.error("EXPIRY ALERT ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch expiry alerts",
    });
  }
});
module.exports = router;