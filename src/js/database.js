/**
 * ==========================================================================
 * Dara Pichmony Water Station | Database & Persistence Engine
 * LocalStorage-based data persistence for customers, billing, and settings
 * ==========================================================================
 * @module database
 * @author Dara Pichmony Water Station System
 * @version 2.0
 */

const DB_KEY_CUSTOMERS = 'aquapure_customers_db';
const DB_KEY_ANALYTICS = 'aquapure_analytics_db';
const DB_KEY_SETTINGS = 'aquapure_settings_db';

// Default error message constants
const DB_ERRORS = {
  READ_FAILED: 'Failed to read from database',
  WRITE_FAILED: 'Failed to write to database',
  PARSE_FAILED: 'Failed to parse stored data',
  INVALID_ID: 'Invalid customer ID provided'
};

/**
 * AquaDatabase - Professional database management class for water station operations
 * Handles CRUD operations, validation, and data persistence with error handling
 */
class AquaDatabase {
  /**
   * Initialize database instance and ensure default data exists
   */
  constructor() {
    this.isStorageAvailable = this._checkStorageAvailability();
    if (this.isStorageAvailable) {
      this.initDatabase();
    }
  }

  /**
   * Check if localStorage is available and accessible
   * @private
   * @returns {boolean} True if localStorage is available
   */
  _checkStorageAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error('LocalStorage is not available:', e);
      return false;
    }
  }

  /**
   * Initialize database with default sample data if empty
   * Ensures required tables exist with valid defaults
   * @returns {boolean} True if initialization successful
   */
  initDatabase() {
    if (!this.isStorageAvailable) return false;

    try {
      if (!localStorage.getItem(DB_KEY_CUSTOMERS)) {
        const defaultCustomers = typeof DEFAULT_CUSTOMERS !== 'undefined' ? DEFAULT_CUSTOMERS : [];
        localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify(defaultCustomers));
      }

      if (!localStorage.getItem(DB_KEY_SETTINGS)) {
        const defaultSettings = {
          ratePerM3: 2500,
          feeHomeConnect: 450000,
          feeCompanyConnect: 1500000,
          stationName: 'Dara Pichmony Water Station',
          currency: '៛'
        };
        localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(defaultSettings));
      }
      return true;
    } catch (e) {
      console.error('Database initialization failed:', e);
      return false;
    }
  }

  /**
   * Get all customer records and bills from database
   * @returns {Array} Array of customer records (empty array if error)
   */
  getCustomers() {
    if (!this.isStorageAvailable) return [];
    try {
      const data = localStorage.getItem(DB_KEY_CUSTOMERS);
      const customers = data ? JSON.parse(data) : [];
      return Array.isArray(customers) ? customers : [];
    } catch (e) {
      console.error('Database read error:', e);
      this._logDatabaseError(DB_ERRORS.READ_FAILED, e);
      return [];
    }
  }

  /**
   * Save full customer list to database
   * @param {Array} customers - Array of customer records to save
   * @returns {boolean} True if save successful
   */
  saveCustomers(customers) {
    if (!this.isStorageAvailable) return false;
    if (!Array.isArray(customers)) {
      console.warn('Invalid customers array provided to saveCustomers');
      return false;
    }
    try {
      localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify(customers));
      return true;
    } catch (e) {
      console.error('Database write error:', e);
      this._logDatabaseError(DB_ERRORS.WRITE_FAILED, e);
      return false;
    }
  }

  /**
   * Add a new customer registration or bill payment record
   * @param {Object} record - Customer record object to add
   * @returns {boolean} True if add successful
   */
  addCustomer(record) {
    if (!record || typeof record !== 'object') {
      console.warn('Invalid record provided to addCustomer');
      return false;
    }
    try {
      const customers = this.getCustomers();
      customers.unshift(record); // Prepend new record so it appears at top
      return this.saveCustomers(customers);
    } catch (e) {
      console.error('Error adding customer:', e);
      return false;
    }
  }

  /**
   * Update an existing customer record by ID
   * @param {string} id - Customer ID to update
   * @param {Object} updatedFields - Fields to update
   * @returns {boolean} True if update successful
   */
  updateCustomer(id, updatedFields) {
    if (!id || typeof id !== 'string') {
      console.warn(DB_ERRORS.INVALID_ID);
      return false;
    }
    if (!updatedFields || typeof updatedFields !== 'object') {
      console.warn('Invalid updated fields provided');
      return false;
    }
    try {
      const customers = this.getCustomers();
      const index = customers.findIndex(c => c.id === id);
      if (index !== -1) {
        customers[index] = { ...customers[index], ...updatedFields };
        return this.saveCustomers(customers);
      }
      console.warn(`Customer with ID ${id} not found`);
      return false;
    } catch (e) {
      console.error('Error updating customer:', e);
      return false;
    }
  }

  /**
   * Delete customer record by ID
   * @param {string} id - Customer ID to delete
   * @returns {boolean} True if delete successful
   */
  deleteCustomer(id) {
    if (!id || typeof id !== 'string') {
      console.warn(DB_ERRORS.INVALID_ID);
      return false;
    }
    try {
      let customers = this.getCustomers();
      const originalLength = customers.length;
      customers = customers.filter(c => c.id !== id);
      if (customers.length < originalLength) {
        return this.saveCustomers(customers);
      }
      console.warn(`Customer with ID ${id} not found for deletion`);
      return false;
    } catch (e) {
      console.error('Error deleting customer:', e);
      return false;
    }
  }

  /**
   * Find customer by Meter ID, Bill ID, Name, Phone, or Company
   * @param {string} query - Search query string
   * @returns {Array} Array of matching customer records
   */
  searchCustomers(query) {
    if (!query || typeof query !== 'string') return [];
    try {
      const customers = this.getCustomers();
      const q = query.trim().toLowerCase();
      return customers.filter(c => 
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.meterId && c.meterId.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone && c.phone.includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
      );
    } catch (e) {
      console.error('Error searching customers:', e);
      return [];
    }
  }

  /**
   * Get system settings including tariff rates and fees
   * @returns {Object} Settings object with rate and fee information
   */
  getSettings() {
    if (!this.isStorageAvailable) {
      return {
        ratePerM3: 2500,
        feeHomeConnect: 450000,
        feeCompanyConnect: 1500000,
        stationName: 'Dara Pichmony Water Station',
        currency: '៛'
      };
    }
    try {
      const data = localStorage.getItem(DB_KEY_SETTINGS);
      return data ? JSON.parse(data) : {
        ratePerM3: 2500,
        feeHomeConnect: 450000,
        feeCompanyConnect: 1500000,
        stationName: 'Dara Pichmony Water Station',
        currency: '៛'
      };
    } catch (e) {
      console.error('Error reading settings:', e);
      return {
        ratePerM3: 2500,
        feeHomeConnect: 450000,
        feeCompanyConnect: 1500000,
        stationName: 'Dara Pichmony Water Station',
        currency: '៛'
      };
    }
  }

  /**
   * Update system settings
   * @param {Object} settings - Settings object to save
   * @returns {boolean} True if save successful
   */
  saveSettings(settings) {
    if (!this.isStorageAvailable) return false;
    if (!settings || typeof settings !== 'object') {
      console.warn('Invalid settings object provided');
      return false;
    }
    try {
      localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      this._logDatabaseError(DB_ERRORS.WRITE_FAILED, e);
      return false;
    }
  }

  /**
   * Reset database to default sample data
   * @returns {Array} Array of default customers after reset
   */
  resetDatabase() {
    if (!this.isStorageAvailable) return [];
    try {
      localStorage.removeItem(DB_KEY_CUSTOMERS);
      localStorage.removeItem(DB_KEY_SETTINGS);
      this.initDatabase();
      return this.getCustomers();
    } catch (e) {
      console.error('Error resetting database:', e);
      return [];
    }
  }

  /**
   * Log database errors with context for debugging
   * @private
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  _logDatabaseError(message, error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message,
      errorDetail: error.message,
      stack: error.stack
    };
    console.error('Database Error Log:', errorLog);
  }
}

// Global database instance
const db = new AquaDatabase();
