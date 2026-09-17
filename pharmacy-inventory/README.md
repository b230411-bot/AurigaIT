# MediStock - Pharmacy Inventory Management System

MediStock is a pharmacy inventory management system designed for neighborhood pharmacies.

The system manages medicines and their batches, tracks expiry dates, calculates sellable stock, and uses FEFO (First Expire, First Out) dispensing so that the batch expiring soonest is used first.

## Features

- User registration and login
- Medicine management
- Batch-level inventory management
- Medicine search
- Pagination and sorting
- Sellable stock calculation
- FEFO dispensing
- Expiry alerts
- Daily clock automation
- Automatic quarantine of expired batches
- Messy batch-data import
- Duplicate detection during import
- Rejected-row reporting
- Reorder threshold monitoring
- Reorder notification outbox
- React-based user interface
- Persistent SQLite database using Prisma

---

## Tech Stack

### Frontend
- React
- Vite
- CSS

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- SQLite
- Prisma ORM

### Authentication
- bcryptjs
- JSON Web Token (JWT)

---

## Project Structure

```text
pharmacy-inventory/
│
├── README.md
├── REASONING.md
├── AI_LOGS.md
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── server.js
│   │   ├── db.js
│   │   ├── auth.js
│   │   ├── medicine.js
│   │   ├── clock.js
│   │   ├── import.js
│   │   └── reorder.js
│   ├── package.json
│   └── dev.db
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── package.json
    └── vite.config.js


    🚀 Setup
Prerequisites

Make sure the following are installed:

Node.js
npm
Git
1. Clone the Repository
git clone https://github.com/b230411-bot/AurigaIT.git

Go to the project directory:

cd AurigaIT/pharmacy-inventory
2. Backend Setup

Open a terminal and run:

cd backend

Install dependencies:

npm install

Generate the Prisma client:

npx prisma generate

Create/update the SQLite database:

npx prisma db push

Start the backend:

node src/server.js

The backend runs on:

http://localhost:5000
3. Frontend Setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Start the frontend:

npm run dev

Vite will display the local URL, normally:

http://localhost:5173

Open the URL displayed by Vite in the browser.

🏥 Application Workflow

The typical workflow is:

Register
   ↓
Login
   ↓
Dashboard
   ↓
Add Medicine
   ↓
Add Batch
   ↓
Search Inventory
   ↓
View Sellable Stock
   ↓
Dispense using FEFO
   ↓
Monitor Expiry Alerts
   ↓
Reorder when stock is below threshold
🔌 REST API Endpoints

Base backend URL:

http://localhost:5000
Authentication APIs
Register User
POST /api/auth/register

Request:

{
  "name": "Jatin Soni",
  "email": "jatin@example.com",
  "password": "123456"
}
Login User
POST /api/auth/login

Request:

{
  "email": "jatin@example.com",
  "password": "123456"
}

Response includes an authentication token and user information.

💊 Medicine APIs
Get Medicines
GET /api/medicines

Supported query parameters:

search
page
limit
sort
order

Example:

GET /api/medicines?search=paracetamol&page=1&limit=20&sort=name&order=asc

This endpoint supports:

Search
Pagination
Sorting
Batch information
Sellable stock calculation
Create Medicine
POST /api/medicines

Example:

{
  "name": "Paracetamol",
  "category": "Pain Relief",
  "description": "Used for fever and pain",
  "reorderThreshold": 20
}
📦 Batch APIs
Add Batch
POST /api/medicines/:id/batches

Example:

{
  "batchNumber": "B001",
  "expiryDate": "2026-10-10",
  "quantity": 50,
  "price": 25
}

Each medicine can have multiple batches.

⚡ FEFO Dispensing
Dispense Medicine
POST /api/medicines/:id/dispense

Example:

{
  "quantity": 60
}
FEFO Logic

FEFO stands for:

First Expire, First Out

The system:

Finds batches with available quantity.
Removes expired batches from consideration.
Sorts valid batches by expiry date.
Uses the earliest-expiring batch first.
Continues with the next batch if required.
Prevents dispensing more than available sellable stock.

Example:

Batch A → 25/09/2026 → 30 units
Batch B → 10/10/2026 → 50 units
Batch C → 15/12/2026 → 100 units

For a request of 40 units:

30 units → Batch A
10 units → Batch B
⚠️ Expiry Alert API
Get Expiring Batches
GET /api/medicines/alerts/expiring?days=30

Example:

GET /api/medicines/alerts/expiring?days=30

The API returns batches that have available stock and are approaching their expiry date.

⏰ T2 — Daily Clock Automation

The daily job is simulated through:

POST /clock

Optional request body:

{
  "now": "2026-09-17T00:00:00Z"
}

The clock job performs the following operations:

1. Quarantine expired batches

Expired batches are marked:

QUARANTINED
2. Flag batches expiring within 7 days

These batches are marked:

EXPIRING_SOON
3. Return job statistics

Example:

{
  "message": "Clock job completed",
  "expiredQuarantined": 1,
  "expiringSoon": 2
}
🗃️ T4 — Messy Data Import

The system supports importing imperfect batch data.

Endpoint:

POST /import

The importer supports:

Null values
Quantities such as "10 units"
dd/mm/yyyy dates
ISO date formats
Duplicate rows

Example:

{
  "batches": [
    {
      "medicineName": "Ibuprofen",
      "batchNumber": "X1",
      "quantity": "10 units",
      "expiryDate": "25/09/2026",
      "price": 20
    },
    {
      "medicineName": "Ibuprofen",
      "batchNumber": "X1",
      "quantity": "10 units",
      "expiryDate": "25/09/2026",
      "price": 20
    },
    {
      "medicineName": "Ibuprofen",
      "batchNumber": "X2",
      "quantity": null,
      "expiryDate": "2026-10-10",
      "price": 20
    }
  ]
}

The import result reports:

{
  "imported": 1,
  "deduped": 1,
  "rejected": 1
}

Where:

imported = successfully inserted rows
deduped = duplicate rows ignored
rejected = invalid rows rejected
🔔 T1 — Reorder Notification

Each medicine can have a reorder threshold.

For example:

Threshold = 20
Sellable stock = 15

Since:

15 < 20

a reorder notification is generated.

Set Reorder Threshold
POST /api/medicines/:id/threshold

Example:

{
  "threshold": 20
}
Check Reorder
POST /api/medicines/:id/check-reorder

This checks the current sellable stock against the configured threshold.

Notification Outbox
GET /outbox

The outbox stores notification events such as:

REORDER_ALERT

Example payload:

{
  "medicineId": 1,
  "medicineName": "Paracetamol",
  "sellableStock": 15,
  "threshold": 20
}

The Outbox provides an integration boundary for a future Notification Service.

🩺 Health Check
GET /api/health

Expected response:

{
  "status": "OK"
}
🗄️ Database Schema

The application uses a persistent SQLite database managed through Prisma.

Main models:

User
Medicine
Batch
Outbox

Relationship:

Medicine 1 ─────── N Batch

A medicine can therefore contain multiple inventory batches.

🔐 Security
Passwords are hashed using bcrypt.
Login generates a JWT token.
Email addresses are unique.
Password validation is performed during registration and login.
Inventory business rules are implemented on the backend.
🧪 Testing

The following functionality was tested during development:

Backend health check
User registration
User login
Medicine creation
Batch creation
Medicine search
Pagination and sorting API
Sellable stock calculation
FEFO dispensing
Expiry alerts
Daily clock automation
Expired batch quarantine
Messy data import
Duplicate detection
Invalid-row rejection
Reorder threshold
Notification outbox
React frontend integration
🐛 Debugging
Backend is not starting

Check whether port 5000 is already in use:

lsof -i :5000

Stop the old process if required and restart:

node src/server.js
Prisma errors

Run:

npx prisma generate
npx prisma db push

Then restart the backend.

Check whether backend is working
curl http://localhost:5000/api/health

Expected:

{
  "status": "OK"
}
Frontend cannot connect to backend

Make sure the backend is running:

cd backend
node src/server.js

The backend should be available at:

http://localhost:5000

Then start the frontend:

cd frontend
npm run dev
🚀 Future Improvements

The following features can be added in future versions:

Supplier management
Purchase order management
Sales history
Inventory audit logs
Role-based access control
PostgreSQL for production deployment
Real Notification Service integration
Email/SMS/WhatsApp alerts
Analytics dashboard
CSV upload interface
Automated scheduled jobs
Barcode scanning
👥 Target Users

MediStock is designed primarily for:

Neighborhood pharmacies
Small pharmacy stores
Medium-sized pharmacies
Pharmacy staff managing inventory

The system helps them reduce manual inventory work, avoid expired stock being dispensed, and identify stock that needs attention.

💡 How MediStock Helps

MediStock provides a single place to manage pharmacy inventory.

It helps pharmacy staff:

Know how much sellable stock is available
Find medicines quickly
Dispense using FEFO
Identify upcoming expiries
Automatically quarantine expired stock
Import messy inventory data
Detect duplicate records
Generate reorder alerts
📌 Three Next Features

The next planned features are:

1. Supplier & Purchase Order Management

Allow pharmacies to manage suppliers and create purchase orders when stock is low.

2. Sales Analytics

Provide dashboards showing sales, inventory movement, fast-moving medicines and expiry trends.

3. Real Notification Service

Connect the Outbox to a real notification service for email, SMS or WhatsApp alerts.

👨‍💻 Project

MediStock — Pharmacy Inventory Management System

Built as part of the Auriga IT Builder Round.






