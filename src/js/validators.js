/**
 * ==========================================================================
 * Dara Pichmony Water Station | Input Validation & Error Handling Utilities
 * ==========================================================================
 * @module validators
 * @description Centralized validation functions for professional form handling
 * @author Dara Pichmony Water Station System
 * @version 1.0
 */

/**
 * Validation rules and regex patterns
 */
const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_KH: /^(\+855|0)\s?[1-9]\d{7,8}$/,
  PHONE_ANY: /^[\d\s+()-]{8,}$/,
  METER_ID: /^MTR-\d+$/,
  BILL_ID: /^BILL-\d+$/,
  ZIP_CODE: /^\d{5}$/,
  MINIMAL_NAME: /^[a-zA-Z\u1780-\u17FF\s]{2,}$/,
  CURRENCY_AMOUNT: /^\d+(\.\d{1,2})?$/,
  URL: /^https?:\/\/.+/,
};

const ERROR_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_NAME: 'Name must be at least 2 characters',
  INVALID_ADDRESS: 'Please enter a valid address',
  INVALID_ZIP: 'ZIP code must be 5 digits',
  INVALID_AMOUNT: 'Please enter a valid amount',
  INVALID_METER_ID: 'Invalid meter ID format (MTR-XXXX)',
  INVALID_BILL_ID: 'Invalid bill ID format (BILL-XXXX)',
  MIN_LENGTH: (min) => `Minimum length is ${min} characters`,
  MAX_LENGTH: (max) => `Maximum length is ${max} characters`,
  RANGE: (min, max) => `Value must be between ${min} and ${max}`,
  MATCH: 'Fields do not match',
};

/**
 * Validator class with comprehensive input validation methods
 */
class InputValidator {
  /**
   * Check if value is not empty
   * @param {*} value - Value to check
   * @returns {boolean}
   */
  static isRequired(value) {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    return this.isRequired(email) && VALIDATION_RULES.EMAIL.test(email);
  }

  /**
   * Validate phone number (flexible for multiple formats)
   * @param {string} phone - Phone to validate
   * @param {boolean} strict - Use strict Khmer format validation
   * @returns {boolean}
   */
  static isValidPhone(phone, strict = false) {
    if (!this.isRequired(phone)) return false;
    const rule = strict ? VALIDATION_RULES.PHONE_KH : VALIDATION_RULES.PHONE_ANY;
    return rule.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validate name format
   * @param {string} name - Name to validate
   * @returns {boolean}
   */
  static isValidName(name) {
    return this.isRequired(name) && name.trim().length >= 2;
  }

  /**
   * Validate address format
   * @param {string} address - Address to validate
   * @returns {boolean}
   */
  static isValidAddress(address) {
    return this.isRequired(address) && address.trim().length >= 5;
  }

  /**
   * Validate ZIP code format
   * @param {string} zip - ZIP code to validate
   * @returns {boolean}
   */
  static isValidZip(zip) {
    if (!this.isRequired(zip)) return false;
    return VALIDATION_RULES.ZIP_CODE.test(zip.trim());
  }

  /**
   * Validate currency amount
   * @param {number|string} amount - Amount to validate
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {boolean}
   */
  static isValidAmount(amount, min = 0, max = 9999999) {
    if (!this.isRequired(amount)) return false;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num >= min && num <= max && VALIDATION_RULES.CURRENCY_AMOUNT.test(String(amount));
  }

  /**
   * Validate meter ID format
   * @param {string} meterId - Meter ID to validate
   * @returns {boolean}
   */
  static isValidMeterId(meterId) {
    if (!this.isRequired(meterId)) return false;
    return VALIDATION_RULES.METER_ID.test(meterId.toUpperCase());
  }

  /**
   * Validate bill ID format
   * @param {string} billId - Bill ID to validate
   * @returns {boolean}
   */
  static isValidBillId(billId) {
    if (!this.isRequired(billId)) return false;
    return VALIDATION_RULES.BILL_ID.test(billId.toUpperCase());
  }

  /**
   * Validate string length
   * @param {string} value - String to validate
   * @param {number} min - Minimum length
   * @param {number} max - Maximum length
   * @returns {boolean}
   */
  static isLengthValid(value, min, max) {
    if (!this.isRequired(value)) return false;
    const len = String(value).length;
    return len >= min && len <= max;
  }

  /**
   * Validate two fields match
   * @param {*} value1 - First value
   * @param {*} value2 - Second value
   * @returns {boolean}
   */
  static isMatchingFields(value1, value2) {
    return value1 === value2;
  }

  /**
   * Validate credit card format (basic)
   * @param {string} cardNumber - Card number to validate
   * @returns {boolean}
   */
  static isValidCardNumber(cardNumber) {
    if (!this.isRequired(cardNumber)) return false;
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^\d{13,19}$/.test(cleaned) && this._luhnCheck(cleaned);
  }

  /**
   * Luhn algorithm for card number validation
   * @private
   * @param {string} num - Number to validate
   * @returns {boolean}
   */
  static _luhnCheck(num) {
    let sum = 0;
    let isEven = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  /**
   * Validate form object with rules
   * @param {Object} formData - Form data to validate
   * @param {Object} rules - Validation rules for each field
   * @returns {Object} {isValid: boolean, errors: {fieldName: errorMessage}}
   */
  static validateForm(formData, rules) {
    const errors = {};
    let isValid = true;

    for (const [field, rule] of Object.entries(rules)) {
      const value = formData[field];

      if (rule.required && !this.isRequired(value)) {
        errors[field] = rule.message || ERROR_MESSAGES.REQUIRED;
        isValid = false;
        continue;
      }

      if (!this.isRequired(value)) continue; // Skip further validation if not required and empty

      if (rule.type === 'email' && !this.isValidEmail(value)) {
        errors[field] = rule.message || ERROR_MESSAGES.INVALID_EMAIL;
        isValid = false;
      } else if (rule.type === 'phone' && !this.isValidPhone(value)) {
        errors[field] = rule.message || ERROR_MESSAGES.INVALID_PHONE;
        isValid = false;
      } else if (rule.type === 'name' && !this.isValidName(value)) {
        errors[field] = rule.message || ERROR_MESSAGES.INVALID_NAME;
        isValid = false;
      } else if (rule.minLength && !this.isLengthValid(value, rule.minLength, Infinity)) {
        errors[field] = rule.message || ERROR_MESSAGES.MIN_LENGTH(rule.minLength);
        isValid = false;
      } else if (rule.maxLength && !this.isLengthValid(value, 0, rule.maxLength)) {
        errors[field] = rule.message || ERROR_MESSAGES.MAX_LENGTH(rule.maxLength);
        isValid = false;
      } else if (rule.custom && !rule.custom(value)) {
        errors[field] = rule.message || 'Invalid value';
        isValid = false;
      }
    }

    return { isValid, errors };
  }
}

/**
 * Form error display utility
 */
class FormErrorHandler {
  /**
   * Display error on form field
   * @param {HTMLElement} element - Form field element
   * @param {string} message - Error message
   */
  static showError(element, message) {
    if (!element) return;
    element.classList.add('is-invalid', 'has-error');
    element.setAttribute('aria-invalid', 'true');

    let errorEl = element.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('error-message')) {
      errorEl = document.createElement('small');
      errorEl.className = 'error-message text-danger';
      element.parentNode.insertBefore(errorEl, element.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  /**
   * Clear error from form field
   * @param {HTMLElement} element - Form field element
   */
  static clearError(element) {
    if (!element) return;
    element.classList.remove('is-invalid', 'has-error');
    element.setAttribute('aria-invalid', 'false');

    const errorEl = element.nextElementSibling;
    if (errorEl && errorEl.classList.contains('error-message')) {
      errorEl.style.display = 'none';
    }
  }

  /**
   * Display all form errors
   * @param {Object} errors - Error map {fieldName: message}
   * @param {HTMLFormElement} form - Form element
   */
  static showFormErrors(errors, form) {
    for (const [fieldName, message] of Object.entries(errors)) {
      const field = form.elements[fieldName];
      if (field) this.showError(field, message);
    }
  }

  /**
   * Clear all form errors
   * @param {HTMLFormElement} form - Form element
   */
  static clearFormErrors(form) {
    const fields = form.querySelectorAll('.is-invalid');
    fields.forEach(field => this.clearError(field));
  }
}

/**
 * Sanitization utility for preventing XSS
 */
class InputSanitizer {
  /**
   * Remove dangerous HTML/script tags
   * @param {string} input - Input string to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeHtml(input) {
    if (typeof input !== 'string') return input;
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return input.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Remove dangerous characters from phone
   * @param {string} phone - Phone input
   * @returns {string} Cleaned phone
   */
  static sanitizePhone(phone) {
    if (typeof phone !== 'string') return phone;
    return phone.replace(/[^0-9+\s()-]/g, '');
  }

  /**
   * Remove dangerous characters from email
   * @param {string} email - Email input
   * @returns {string} Cleaned email
   */
  static sanitizeEmail(email) {
    if (typeof email !== 'string') return email;
    return email.trim().toLowerCase();
  }

  /**
   * Sanitize object for safe storage
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHtml(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputValidator, FormErrorHandler, InputSanitizer, VALIDATION_RULES, ERROR_MESSAGES };
}
