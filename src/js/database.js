// ==========================================================================
// AquaPure Water Station | Database & Persistence Engine (LocalStorage & JSON)
// ==========================================================================

const DB_KEY_CUSTOMERS = 'aquapure_customers_db';
const DB_KEY_ANALYTICS = 'aquapure_analytics_db';
const DB_KEY_SETTINGS = 'aquapure_settings_db';

class AquaDatabase {
  constructor() {
    this.initDatabase();
  }

  // Initialize database with default sample data if empty
  initDatabase() {
    if (!localStorage.getItem(DB_KEY_CUSTOMERS)) {
      // DEFAULT_CUSTOMERS is loaded from app.js or defined here
      if (typeof DEFAULT_CUSTOMERS !== 'undefined') {
        localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
      } else {
        localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem(DB_KEY_SETTINGS)) {
      const defaultSettings = {
        ratePerM3: 2500,
        feeHomeConnect: 450000,
        feeCompanyConnect: 1500000,
        stationName: 'ស្ថានីយទឹកស្អាត AquaPure',
        currency: '៛'
      };
      localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(defaultSettings));
    }
  }

  // Get all customer records and bills
  getCustomers() {
    try {
      const data = localStorage.getItem(DB_KEY_CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Database read error:', e);
      return [];
    }
  }

  // Save full customer list
  saveCustomers(customers) {
    try {
      localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify(customers));
      return true;
    } catch (e) {
      console.error('Database write error:', e);
      return false;
    }
  }

  // Add a new customer registration or bill payment record
  addCustomer(record) {
    const customers = this.getCustomers();
    // Prepend new record so it appears at top
    customers.unshift(record);
    return this.saveCustomers(customers);
  }

  // Update an existing customer record by ID
  updateCustomer(id, updatedFields) {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updatedFields };
      return this.saveCustomers(customers);
    }
    return false;
  }

  // Delete customer record by ID
  deleteCustomer(id) {
    let customers = this.getCustomers();
    customers = customers.filter(c => c.id !== id);
    return this.saveCustomers(customers);
  }

  // Find customer by Meter ID or Bill ID or Phone
  searchCustomers(query) {
    const customers = this.getCustomers();
    const q = query.trim().toLowerCase();
    return customers.filter(c => 
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.meterId && c.meterId.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  }

  // Get system settings (tariff rates)
  getSettings() {
    try {
      const data = localStorage.getItem(DB_KEY_SETTINGS);
      return data ? JSON.parse(data) : { ratePerM3: 2500, feeHomeConnect: 450000, feeCompanyConnect: 1500000 };
    } catch (e) {
      return { ratePerM3: 2500, feeHomeConnect: 450000, feeCompanyConnect: 1500000 };
    }
  }

  // Update settings
  saveSettings(settings) {
    try {
      localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Reset to default sample data
  resetDatabase() {
    localStorage.removeItem(DB_KEY_CUSTOMERS);
    localStorage.removeItem(DB_KEY_SETTINGS);
    this.initDatabase();
    return this.getCustomers();
  }
}

// Global database instance
const db = new AquaDatabase();
