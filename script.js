// script.js - Main JavaScript file for Local Skill Finder

// ========================================
// Configuration
// ========================================
const API_BASE_URL = '/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// ========================================
// Authentication Functions
// ========================================

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return localStorage.getItem(TOKEN_KEY) !== null;
}

/**
 * Get current user from localStorage
 * @returns {object|null}
 */
function getCurrentUser() {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Get authentication token
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save authentication data
 * @param {string} token 
 * @param {object} user 
 */
function saveAuthData(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear authentication data
 */
function clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * Logout user
 */
function logout() {
    clearAuthData();
    window.location.href = 'login.html';
}

/**
 * Check authentication and redirect if needed
 * @param {string} requiredRole - Optional role requirement
 */
function requireAuth(requiredRole = null) {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }

    if (requiredRole) {
        const user = getCurrentUser();
        if (user.role !== requiredRole) {
            alert('Access denied. You do not have permission to view this page.');
            window.location.href = 'index.html';
            return false;
        }
    }

    return true;
}

// ========================================
// API Functions
// ========================================

/**
 * Make API request with authentication
 * @param {string} endpoint 
 * @param {object} options 
 * @returns {Promise}
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401) {
            // Unauthorized - token expired or invalid
            clearAuthData();
            window.location.href = 'login.html';
            throw new Error('Authentication required');
        }

        return response;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @param {string} role 
 * @returns {Promise}
 */
async function loginUser(email, password, role) {
    const response = await apiRequest('/Auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role })
    });

    if (response.ok) {
        const data = await response.json();
        saveAuthData(data.token, data.user);
        return data;
    } else {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }
}

/**
 * Register user
 * @param {object} userData 
 * @returns {Promise}
 */
async function registerUser(userData) {
    const endpoint = userData.accountType === 'worker' 
        ? '/Auth/register-worker' 
        : '/Auth/register';

    const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(userData)
    });

    if (response.ok) {
        return await response.json();
    } else {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
    }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Show toast notification
 * @param {string} message 
 * @param {string} type - success, error, warning, info
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style toast
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format date to readable string
 * @param {string|Date} date 
 * @returns {string}
 */
function formatDate(date) {
    const d = new Date(date);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
}

/**
 * Format time to readable string
 * @param {string} time 
 * @returns {string}
 */
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Calculate distance between two coordinates
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Debounce function
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const regex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return regex.test(phone);
}

/**
 * Get query parameter from URL
 * @param {string} param 
 * @returns {string|null}
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Scroll to element smoothly
 * @param {string} elementId 
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Copy text to clipboard
 * @param {string} text 
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

/**
 * Format currency (Indian Rupees)
 * @param {number} amount 
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Validate password strength
 * @param {string} password 
 * @returns {object} {strength: number (0-100), message: string}
 */
function validatePasswordStrength(password) {
    let strength = 0;
    let message = '';

    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 25;

    if (strength <= 25) {
        message = 'Weak';
    } else if (strength <= 50) {
        message = 'Fair';
    } else if (strength <= 75) {
        message = 'Good';
    } else {
        message = 'Strong';
    }

    return { strength, message };
}

/**
 * Get time ago string
 * @param {string|Date} date 
 * @returns {string}
 */
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
}

/**
 * Create loading spinner
 * @returns {HTMLElement}
 */
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner"></div>
        <style>
            .loading-spinner {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 2rem;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    return spinner;
}

/**
 * Handle form submission with loading state
 * @param {HTMLFormElement} form 
 * @param {Function} handler 
 */
function handleFormSubmit(form, handler) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';
        
        try {
            await handler(e);
        } catch (error) {
            showToast(error.message || 'An error occurred', 'error');
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// ========================================
// Local Storage Utilities
// ========================================

/**
 * Save data to localStorage
 * @param {string} key 
 * @param {any} value 
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Get data from localStorage
 * @param {string} key 
 * @returns {any}
 */
function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

/**
 * Remove data from localStorage
 * @param {string} key 
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

// ========================================
// Initialize
// ========================================

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Log initialization
console.log('Local Skill Finder - Script Loaded');

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getCurrentUser,
        getToken,
        saveAuthData,
        clearAuthData,
        logout,
        requireAuth,
        apiRequest,
        loginUser,
        registerUser,
        showToast,
        formatDate,
        formatTime,
        calculateDistance,
        debounce,
        isValidEmail,
        isValidPhone,
        getQueryParam,
        scrollToElement,
        copyToClipboard,
        formatCurrency,
        validatePasswordStrength,
        timeAgo,
        createLoadingSpinner,
        handleFormSubmit,
        saveToStorage,
        getFromStorage,
        removeFromStorage
    };
}