import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [medicineForm, setMedicineForm] = useState({
    name: "",
    category: "",
    description: "",
    reorderThreshold: 10,
  });

  const [batchForm, setBatchForm] = useState({
    medicineId: "",
    batchNumber: "",
    quantity: "",
    price: "",
    expiryDate: "",
  });

  const [dispenseQty, setDispenseQty] = useState({});

  const request = async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  const loadMedicines = async () => {
    try {
      setLoading(true);

      const data = await request(
        `/api/medicines?search=${encodeURIComponent(
          search
        )}&page=1&limit=50&sort=name&order=asc`
      );

      setMedicines(data.medicines || data || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await request("/api/medicines/alerts/expiring?days=30");
      setAlerts(data.batches || data.alerts || []);
    } catch (err) {
      console.log(err.message);
    }
  };

  useEffect(() => {
    if (page === "dashboard" && user) {
      loadMedicines();
      loadAlerts();
    }
  }, [page, user]);

  const login = async (e) => {
    e.preventDefault();

    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });

      setUser(data.user);
      setPage("dashboard");
      setMessage("Login successful!");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const register = async (e) => {
    e.preventDefault();

    try {
      await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(authForm),
      });

      setMessage("Registration successful. Please login.");
      setPage("login");
      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setMessage(err.message);
    }
  };

  const addMedicine = async (e) => {
    e.preventDefault();

    try {
      await request("/api/medicines", {
        method: "POST",
        body: JSON.stringify({
          ...medicineForm,
          reorderThreshold: Number(medicineForm.reorderThreshold),
        }),
      });

      setMedicineForm({
        name: "",
        category: "",
        description: "",
        reorderThreshold: 10,
      });

      setMessage("Medicine added successfully!");
      await loadMedicines();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const addBatch = async (e) => {
    e.preventDefault();

    try {
      await request(`/api/medicines/${batchForm.medicineId}/batches`, {
        method: "POST",
        body: JSON.stringify({
          batchNumber: batchForm.batchNumber,
          quantity: Number(batchForm.quantity),
          price: Number(batchForm.price),
          expiryDate: batchForm.expiryDate,
        }),
      });

      setBatchForm({
        medicineId: "",
        batchNumber: "",
        quantity: "",
        price: "",
        expiryDate: "",
      });

      setMessage("Batch added successfully!");
      await loadMedicines();
      await loadAlerts();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const dispense = async (medicineId) => {
    const quantity = Number(dispenseQty[medicineId]);

    if (!quantity || quantity <= 0) {
      setMessage("Enter a valid quantity.");
      return;
    }

    try {
      const data = await request(`/api/medicines/${medicineId}/dispense`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });

      setMessage(
        `Dispensed ${quantity} units successfully using FEFO.`
      );

      setDispenseQty({
        ...dispenseQty,
        [medicineId]: "",
      });

      await loadMedicines();
      await loadAlerts();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const logout = () => {
    setUser(null);
    setPage("landing");
    setMedicines([]);
    setAlerts([]);
    setMessage("");
  };

  /* ================= LANDING ================= */

  if (page === "landing") {
    return (
      <div className="app">
        <nav className="navbar">
          <div className="logo">
            <span>💊</span> MediStock
          </div>

          <div className="nav-actions">
            <button
              className="btn secondary"
              onClick={() => setPage("login")}
            >
              Login
            </button>

            <button
              className="btn primary"
              onClick={() => setPage("register")}
            >
              Get Started
            </button>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-content">
            <div className="badge">🏥 Smart Pharmacy Inventory</div>

            <h1>
              Never let a medicine
              <span> expire on your shelf.</span>
            </h1>

            <p>
              MediStock helps neighborhood pharmacies manage batches,
              expiry dates and stock automatically — so the right medicine
              is always dispensed at the right time.
            </p>

            <div className="hero-buttons">
              <button
                className="btn primary large"
                onClick={() => setPage("register")}
              >
                Start Managing Stock →
              </button>

              <button
                className="btn secondary large"
                onClick={() => setPage("login")}
              >
                Sign In
              </button>
            </div>
          </div>

          <div className="hero-card">
            <div className="mini-header">
              <span>Inventory Overview</span>
              <span className="live">● Live</span>
            </div>

            <div className="mini-stats">
              <div>
                <strong>1,248</strong>
                <small>Total Units</small>
              </div>

              <div>
                <strong>42</strong>
                <small>Medicines</small>
              </div>

              <div>
                <strong>7</strong>
                <small>Expiring Soon</small>
              </div>
            </div>

            <div className="stock-line">
              <div>
                <span>Paracetamol</span>
                <b>180 units</b>
              </div>
              <div className="progress">
                <span style={{ width: "80%" }}></span>
              </div>
            </div>

            <div className="stock-line">
              <div>
                <span>Ibuprofen</span>
                <b>96 units</b>
              </div>
              <div className="progress">
                <span style={{ width: "58%" }}></span>
              </div>
            </div>

            <div className="stock-line">
              <div>
                <span>Amoxicillin</span>
                <b>64 units</b>
              </div>
              <div className="progress">
                <span style={{ width: "42%" }}></span>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="section-title">
            <span>WHY MEDISTOCK?</span>
            <h2>Everything your pharmacy needs</h2>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Batch Management</h3>
              <p>
                Track every medicine batch with quantity, price and
                expiry date.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>FEFO Dispensing</h3>
              <p>
                First Expire, First Out ensures the nearest-expiring
                valid batch is always used first.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>Smart Alerts</h3>
              <p>
                Get notified about medicines nearing expiry and stock
                levels requiring re-order.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Instant Search</h3>
              <p>
                Quickly answer questions like "Do we have paracetamol
                in date?"
              </p>
            </div>
          </div>
        </section>

        <section className="audience">
          <div>
            <span>BUILT FOR</span>
            <h2>Neighborhood pharmacies</h2>
            <p>
              Designed for small and medium pharmacies that need a
              simple, reliable and affordable way to manage inventory.
            </p>
          </div>

          <div className="next-features">
            <h3>What's next?</h3>
            <p>🚚 Supplier & purchase order management</p>
            <p>📊 Sales analytics & reports</p>
            <p>📱 WhatsApp/SMS notifications</p>
          </div>
        </section>

        <footer>
          <strong>💊 MediStock</strong>
          <span>Smart inventory for smarter pharmacies.</span>
        </footer>
      </div>
    );
  }

  /* ================= AUTH ================= */

  if (page === "login" || page === "register") {
    const isLogin = page === "login";

    return (
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-brand">💊 MediStock</div>

          <h1>
            {isLogin
              ? "Welcome back."
              : "Manage your pharmacy smarter."}
          </h1>

          <p>
            {isLogin
              ? "Sign in to access your pharmacy inventory."
              : "Create your account and start managing medicine inventory."}
          </p>

          <div className="auth-points">
            <div>✓ Real-time stock tracking</div>
            <div>✓ FEFO based dispensing</div>
            <div>✓ Expiry & reorder alerts</div>
          </div>
        </div>

        <div className="auth-box">
          <button
            className="back-button"
            onClick={() => setPage("landing")}
          >
            ← Back
          </button>

          <h2>{isLogin ? "Sign in" : "Create account"}</h2>

          <p className="auth-subtitle">
            {isLogin
              ? "Enter your credentials to continue."
              : "Fill in your details to get started."}
          </p>

          {message && <div className="message">{message}</div>}

          <form onSubmit={isLogin ? login : register}>
            {!isLogin && (
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Jatin Soni"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    email: e.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    password: e.target.value,
                  })
                }
                required
              />
            </label>

            <button className="btn primary full" type="submit">
              {isLogin ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          <div className="switch-auth">
            {isLogin ? "Don't have an account?" : "Already have an account?"}

            <button
              onClick={() => {
                setMessage("");
                setPage(isLogin ? "register" : "login");
              }}
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= DASHBOARD ================= */

  const totalStock = medicines.reduce(
    (sum, medicine) => sum + (medicine.sellableStock || 0),
    0
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="logo">
          <span>💊</span> MediStock
        </div>

        <div className="header-right">
          <span>
            Welcome, <strong>{user?.name || "User"}</strong>
          </span>

          <button className="logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <span>PHARMACY INVENTORY</span>
            <h1>Good to see you 👋</h1>
            <p>Monitor your stock and keep every medicine in date.</p>
          </div>
        </div>

        {message && <div className="dashboard-message">{message}</div>}

        {/* Stats */}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">💊</div>
            <div>
              <span>Total Medicines</span>
              <strong>{medicines.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">📦</div>
            <div>
              <span>Sellable Stock</span>
              <strong>{totalStock}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">⚠️</div>
            <div>
              <span>Expiring Soon</span>
              <strong>{alerts.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">🔄</div>
            <div>
              <span>FEFO Enabled</span>
              <strong>YES</strong>
            </div>
          </div>
        </div>

        {/* Add medicine + batch */}

        <div className="forms-grid">
          <div className="panel">
            <div className="panel-title">
              <div>
                <span>INVENTORY</span>
                <h2>Add Medicine</h2>
              </div>
              <span className="panel-icon">💊</span>
            </div>

            <form onSubmit={addMedicine} className="dashboard-form">
              <input
                placeholder="Medicine name"
                value={medicineForm.name}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    name: e.target.value,
                  })
                }
                required
              />

              <input
                placeholder="Category"
                value={medicineForm.category}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    category: e.target.value,
                  })
                }
              />

              <input
                type="number"
                placeholder="Reorder threshold"
                value={medicineForm.reorderThreshold}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    reorderThreshold: e.target.value,
                  })
                }
              />

              <input
                placeholder="Description"
                value={medicineForm.description}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    description: e.target.value,
                  })
                }
              />

              <button className="btn primary" type="submit">
                + Add Medicine
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-title">
              <div>
                <span>STOCK</span>
                <h2>Add Batch</h2>
              </div>
              <span className="panel-icon">📦</span>
            </div>

            <form onSubmit={addBatch} className="dashboard-form">
              <select
                value={batchForm.medicineId}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    medicineId: e.target.value,
                  })
                }
                required
              >
                <option value="">Select medicine</option>

                {medicines.map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {medicine.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Batch number"
                value={batchForm.batchNumber}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    batchNumber: e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                placeholder="Quantity"
                value={batchForm.quantity}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    quantity: e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                placeholder="Price"
                value={batchForm.price}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    price: e.target.value,
                  })
                }
                required
              />

              <input
                type="date"
                value={batchForm.expiryDate}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    expiryDate: e.target.value,
                  })
                }
                required
              />

              <button className="btn primary" type="submit">
                + Add Batch
              </button>
            </form>
          </div>
        </div>

        {/* Search */}

        <div className="inventory-panel panel">
          <div className="inventory-header">
            <div>
              <span>MEDICINES</span>
              <h2>Current Inventory</h2>
            </div>

            <div className="search-box">
              🔍
              <input
                placeholder="Search medicine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadMedicines();
                }}
              />
              <button onClick={loadMedicines}>Search</button>
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading inventory...</div>
          ) : medicines.length === 0 ? (
            <div className="empty">
              No medicines found. Add your first medicine above.
            </div>
          ) : (
            <div className="medicine-list">
              {medicines.map((medicine) => (
                <div className="medicine-card" key={medicine.id}>
                  <div className="medicine-main">
                    <div className="medicine-avatar">💊</div>

                    <div>
                      <h3>{medicine.name}</h3>

                      <span className="category">
                        {medicine.category || "General Medicine"}
                      </span>

                      {medicine.description && (
                        <p>{medicine.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="medicine-stock">
                    <span>SELLABLE STOCK</span>
                    <strong>{medicine.sellableStock || 0}</strong>
                    <small>units</small>
                  </div>

                  <div className="dispense-box">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={dispenseQty[medicine.id] || ""}
                      onChange={(e) =>
                        setDispenseQty({
                          ...dispenseQty,
                          [medicine.id]: e.target.value,
                        })
                      }
                    />

                    <button
                      className="dispense-btn"
                      onClick={() => dispense(medicine.id)}
                    >
                      Dispense FEFO
                    </button>
                  </div>

                  <div className="batch-summary">
                    <span>
                      {medicine.batches?.length || 0} batch(es)
                    </span>

                    <div className="batch-dots">
                      {medicine.batches?.slice(0, 5).map((batch) => (
                        <span
                          key={batch.id}
                          title={`Batch ${batch.batchNumber}`}
                        ></span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiry alerts */}

        <div className="panel alerts-panel">
          <div className="panel-title">
            <div>
              <span>EXPIRY MONITOR</span>
              <h2>Expiry Alerts</h2>
            </div>

            <button className="refresh" onClick={loadAlerts}>
              ↻ Refresh
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="safe-alert">
              <span>✓</span>
              <div>
                <strong>No medicines expiring in the next 30 days</strong>
                <p>Your inventory currently looks safe.</p>
              </div>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((batch, index) => {
                const medicineName =
                  batch.medicine?.name ||
                  batch.medicineName ||
                  "Medicine";

                const expiry = new Date(
                  batch.expiryDate
                ).toLocaleDateString("en-IN");

                return (
                  <div className="alert-row" key={batch.id || index}>
                    <div className="alert-medicine">
                      <span>⚠️</span>
                      <div>
                        <strong>{medicineName}</strong>
                        <small>
                          Batch: {batch.batchNumber}
                        </small>
                      </div>
                    </div>

                    <div>
                      <span className="alert-label">EXPIRY</span>
                      <strong>{expiry}</strong>
                    </div>

                    <div>
                      <span className="alert-label">QUANTITY</span>
                      <strong>{batch.quantity}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="automation-note">
          <div className="automation-icon">⚙️</div>

          <div>
            <span>AUTOMATION</span>
            <h3>Daily expiry & reorder protection</h3>
            <p>
              The backend clock job flags medicines expiring within
              7 days, quarantines expired stock and generates reorder
              notifications when sellable inventory falls below its
              threshold.
            </p>
          </div>

          <div className="automation-status">
            <span>●</span> Active
          </div>
        </div>
      </main>

      <footer>
        <strong>💊 MediStock</strong>
        <span>Smart pharmacy inventory management</span>
      </footer>
    </div>
  );
}

export default App;