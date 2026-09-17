const express = require("express");
const prisma = require("./db");

const router = express.Router();

function parseQuantity(value) {
  if (value === null || value === undefined) return null;

  const match = String(value).match(/\d+/);

  return match ? parseInt(match[0]) : null;
}

function parseDate(value) {
  if (!value) return null;

  const str = String(value).trim();

  // dd/mm/yyyy
  const ddmmyyyy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return isNaN(date.getTime()) ? null : date;
  }

  // ISO
  const date = new Date(str);

  return isNaN(date.getTime()) ? null : date;
}

router.post("/", async (req, res) => {
  try {
    const rows = Array.isArray(req.body)
      ? req.body
      : req.body.batches || req.body.rows || [];

    let imported = 0;
    let deduped = 0;
    let rejected = 0;

    const seen = new Set();

    for (const row of rows) {
      const medicineName = row.medicineName || row.medicine || row.name;
      const batchNumber = row.batchNumber || row.batch;
      const quantity = parseQuantity(row.quantity);
      const expiryDate = parseDate(row.expiryDate || row.expiry);
      const price = Number(row.price || 0);

      if (
        !medicineName ||
        !batchNumber ||
        quantity === null ||
        quantity <= 0 ||
        !expiryDate
      ) {
        rejected++;
        continue;
      }

      const key =
        `${medicineName.toLowerCase()}|${batchNumber}|${expiryDate.toISOString()}`;

      if (seen.has(key)) {
        deduped++;
        continue;
      }

      seen.add(key);

      let medicine = await prisma.medicine.findFirst({
        where: {
          name: {
            equals: medicineName,
          },
        },
      });

      if (!medicine) {
        medicine = await prisma.medicine.create({
          data: {
            name: medicineName,
          },
        });
      }

      const existing = await prisma.batch.findFirst({
        where: {
          medicineId: medicine.id,
          batchNumber,
          expiryDate,
        },
      });

      if (existing) {
        deduped++;
        continue;
      }

      await prisma.batch.create({
        data: {
          medicineId: medicine.id,
          batchNumber,
          expiryDate,
          quantity,
          price: isNaN(price) ? 0 : price,
        },
      });

      imported++;
    }

    res.json({
      imported,
      deduped,
      rejected,
    });
  } catch (error) {
    console.error("IMPORT ERROR:", error);

    res.status(500).json({
      message: "Import failed",
      error: error.message,
    });
  }
});

module.exports = router;