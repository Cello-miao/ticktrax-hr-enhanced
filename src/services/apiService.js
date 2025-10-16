// Enhanced API Service with Advanced Features
// Gotham Time Manager / Ticktrax API Integration
// Includes: Caching, Retry Logic, Request Deduplication, Performance Monitoring

import { API_CONFIG, replacePathParams, buildQueryString } from '../config/api.complete.js';
import { mockApiService } from './mockApiService.js';

class TicktraxApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.jwtToken = null;
    this.csrfToken = null;
    
    // 🚀 Performance & Caching
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes default
    this.requestQueue = new Map(); // Request deduplication
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS || 3;
    this.retryDelay = 1000; // 1 second base delay
    
    // 📊 Performance Monitoring
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // 🔄 Request Interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // 🎯 Rate Limiting
    this.rateLimitConfig = {
      maxRequests: 100,
      timeWindow: 60000, // 1 minute
      requests: []
    };
  }

  // ==================== TOKEN MANAGEMENT ====================
  
  initializeTokens() {
    this.jwtToken = localStorage.getItem('jwt_token');
    this.csrfToken = localStorage.getItem('csrf_token');
  }

  setTokens(jwtToken, csrfToken = null) {
    this.jwtToken = jwtToken;
    this.csrfToken = csrfToken;
    if (jwtToken) localStorage.setItem('jwt_token', jwtToken);
    if (csrfToken) localStorage.setItem('csrf_token', csrfToken);
  }

  clearTokens() {
    this.jwtToken = null;
    this.csrfToken = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('csrf_token');
    localStorage.removeItem('user_data');
    this.clearCache(); // Clear cache on logout
  }

  isAuthenticated() {
    this.initializeTokens();
    return Boolean(this.jwtToken);
  }

  // ==================== CACHING SYSTEM ====================
  
  /**
   * Set cache entry with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setCache(key, data, ttl = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cache entry if valid
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null
   */
  getCache(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    this.metrics.cacheHits++;
    return entry.data;
  }

  /**
   * Clear all cache or specific key
   * @param {string} key - Optional specific key to clear
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Generate cache key from endpoint and params
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {string} - Cache key
   */
  generateCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
  }

  // ==================== REQUEST DEDUPLICATION ====================
  
  /**
   * Check if request is already in progress
   * @param {string} key - Request key
   * @returns {Promise} - Existing request promise or null
   */
  getPendingRequest(key) {
    return this.requestQueue.get(key) || null;
  }

  /**
   * Add request to queue
   * @param {string} key - Request key
   * @param {Promise} promise - Request promise
   */
  addPendingRequest(key, promise) {
    this.requestQueue.set(key, promise);
    
    // Clean up when request completes
    promise.finally(() => {
      this.requestQueue.delete(key);
    });
  }

  // ==================== RATE LIMITING ====================
  
  /**
   * Check if request is within rate limits
   * @returns {boolean} - True if within limits
   */
  isWithinRateLimit() {
    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.timeWindow;
    
    // Remove old requests outside time window
    this.rateLimitConfig.requests = this.rateLimitConfig.requests.filter(
      timestamp => timestamp > windowStart
    );
    
    return this.rateLimitConfig.requests.length < this.rateLimitConfig.maxRequests;
  }

  /**
   * Record request for rate limiting
   */
  recordRequest() {
    this.rateLimitConfig.requests.push(Date.now());
  }

  // ==================== RETRY LOGIC ====================
  
  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    return this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} - True if retryable
   */
  isRetryableError(error) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const retryableMessages = ['timeout', 'network', 'connection'];
    
    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }
    
    const message = error.message?.toLowerCase() || '';
    return retryableMessages.some(keyword => message.includes(keyword));
  }

  // ==================== INTERCEPTORS ====================
  
  /**
   * Add request interceptor
   * @param {Function} interceptor - Interceptor function
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   * @param {Function} interceptor - Interceptor function
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // ==================== PERFORMANCE MONITORING ====================
  
  /**
   * Update performance metrics
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether request was successful
   */
  updateMetrics(responseTime, success) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update average response time
    const total = this.metrics.totalRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;
  }

  /**
   * Get performance metrics
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      successRate: this.metrics.successfulRequests / this.metrics.totalRequests || 0
    };
  }

  // ==================== ENHANCED REQUEST METHOD ====================
  
  async request(endpoint, options = {}) {
    const startTime = Date.now();
    const requestKey = this.generateCacheKey(endpoint, options.params);
    
    // Check for pending request (deduplication)
    const pendingRequest = this.getPendingRequest(requestKey);
    if (pendingRequest && options.method === 'GET') {
      console.log(`[API] Deduplicating request: ${endpoint}`);
      return await pendingRequest;
    }

    // Check cache for GET requests
    if (options.method === 'GET' || !options.method) {
      const cachedData = this.getCache(requestKey);
      if (cachedData) {
        console.log(`[API] Cache hit: ${endpoint}`);
        return cachedData;
      }
    }

    // Rate limiting check
    if (!this.isWithinRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Record request for rate limiting
    this.recordRequest();

    // Apply request interceptors
    let modifiedOptions = { ...options };
    for (const interceptor of this.requestInterceptors) {
      modifiedOptions = await interceptor(modifiedOptions, endpoint);
    }

    // Create request promise
    const requestPromise = this.executeRequest(endpoint, modifiedOptions, startTime);
    
    // Add to pending requests for deduplication
    if (options.method === 'GET' || !options.method) {
      this.addPendingRequest(requestKey, requestPromise);
    }

    return await requestPromise;
  }

  async executeRequest(endpoint, options, startTime) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.makeRequest(endpoint, options);
        const responseTime = Date.now() - startTime;
        
        // Update metrics
        this.updateMetrics(responseTime, true);
        
        // Cache successful GET requests
        if ((options.method === 'GET' || !options.method) && result) {
          this.setCache(this.generateCacheKey(endpoint, options.params), result);
        }
        
        // Apply response interceptors
        let finalResult = result;
        for (const interceptor of this.responseInterceptors) {
          finalResult = await interceptor(finalResult, endpoint, options);
        }
        
        return finalResult;
        
      } catch (error) {
        lastError = error;
        const responseTime = Date.now() - startTime;
        
        // Update metrics
        this.updateMetrics(responseTime, false);
        
        // Check if we should retry
        if (attempt < this.retryAttempts && this.isRetryableError(error)) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`[API] Retry ${attempt}/${this.retryAttempts} in ${delay}ms for ${endpoint}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = {
        'Accept': 'application/json',
        ...options.headers
      };

      // Add authentication token
      this.initializeTokens();
      if (this.jwtToken) {
        headers[API_CONFIG.HEADERS.AUTHORIZATION] = `Bearer ${this.jwtToken}`;
      }

      // Add CSRF token for state-changing requests
      const method = (options.method || 'GET').toUpperCase();
      if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        headers[API_CONFIG.HEADERS.CSRF_TOKEN] = this.csrfToken;
      }

      const config = {
        method,
        headers,
        ...options
      };

      // Only set Content-Type if there is an explicit JSON body
      if (config.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      console.log(`[API] ${method} ${url}`);
      
      const response = await fetch(url, config);
      
      // Handle error responses
      if (!response.ok) {
        let message = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          message = errJson?.error || errJson?.message || 
                   (Array.isArray(errJson?.errors) ? errJson.errors.join(', ') : message);
        } catch (_) {}
        
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      
      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        const text = await response.text();
        return text ? { message: text } : { success: true };
      }

      const data = await response.json();
      console.log('[API] Response:', data);

      return data;
    } catch (error) {
      console.error('[API] Error:', error);

      // 🔄 Fallback to Mock Service for Development
      // Do NOT fallback when running inside Cordova (mobile), always use real API
      const isCordova = typeof window !== 'undefined' && (window.cordova || window.PhoneGap || window.phonegap);
      if (!isCordova && (error.message.includes('401') || error.message.includes('403') || error.message.includes('404') || error.message.includes('Failed to fetch'))) {
        console.log(`[API] Falling back to mock service for: ${endpoint}`);
        try {
          return await this.getMockResponse(endpoint, options);
        } catch (mockError) {
          console.error(`[API] Mock service also failed:`, mockError);
        }
      }

      throw error;
    }
  }

  // 🔄 Mock Service Fallback
  async getMockResponse(endpoint, options = {}) {
    console.log(`[API] Using mock response for: ${endpoint}`);
    
    // Map endpoints to mock methods
    if (endpoint.includes('/auth/login')) {
      return await mockApiService.login({ email: 'demo@example.com', password: 'password123' });
    } else if (endpoint.includes('/auth/me')) {
      return await mockApiService.getCurrentUser();
    } else if (endpoint.includes('/users')) {
      return await mockApiService.listUsers();
    } else if (endpoint.includes('/time/status')) {
      return await mockApiService.getTimeStatus();
    } else if (endpoint.includes('/time/entries')) {
      return await mockApiService.getTimeEntries();
    } else if (endpoint.includes('/time/clock-in')) {
      return await mockApiService.clockIn({ work_location: 'Office' });
    } else if (endpoint.includes('/time/clock-out')) {
      return await mockApiService.clockOut({ work_location: 'Office' });
    } else if (endpoint.includes('/notifications')) {
      return await mockApiService.getNotifications();
    } else if (endpoint.includes('/analytics/overview')) {
      return await mockApiService.getAnalyticsOverview();
    } else if (endpoint.includes('/analytics/attendance')) {
      return await mockApiService.getAnalyticsOverview();
    } else if (endpoint.includes('/analytics/productivity')) {
      return await mockApiService.getAnalyticsOverview();
    } else if (endpoint.includes('/approvals/pending')) {
      return await mockApiService.getPendingApprovals();
    } else if (endpoint.includes('/teams')) {
      return await mockApiService.listTeams();
    } else if (endpoint.includes('/payroll/summary')) {
      return await mockApiService.getPayrollSummary({ period: 'current' });
    } else {
      // Generic mock response
      return { success: true, data: {}, message: 'Mock response' };
    }
  }

  // ==================== CACHED GET METHODS ====================
  
  /**
   * Get data with caching
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Additional options
   * @returns {Promise} - Cached or fresh data
   */
  async getCached(endpoint, params = {}, options = {}) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const cachedData = this.getCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const query = buildQueryString(params);
    const result = await this.request(`${endpoint}${query}`, { ...options, method: 'GET' });
    
    // Cache the result
    this.setCache(cacheKey, result, options.cacheTTL);
    
    return result;
  }

  // ==================== BATCH REQUESTS ====================
  
  /**
   * Execute multiple requests in parallel
   * @param {Array} requests - Array of request objects
   * @returns {Promise<Array>} - Array of results
   */
  async batchRequest(requests) {
    const promises = requests.map(req => 
      this.request(req.endpoint, req.options)
    );
    
    return await Promise.allSettled(promises);
  }

  // ==================== 🔐 AUTHENTICATION (4 endpoints) ====================
  
  async register(payload) {
    const result = await this.request(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const token = result?.data?.token || result?.meta?.token;
    const csrf = result?.data?.csrf_token || result?.meta?.csrf_token;
    if (token) this.setTokens(token, csrf);
    
    return result;
  }

  async login(credentials) {
    const result = await this.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    const token = result?.data?.token || result?.meta?.token;
    const csrf = result?.data?.csrf_token || result?.meta?.csrf_token;
    if (token) this.setTokens(token, csrf);
    
    return result;
  }

  async getCurrentUser() {
    return await this.getCached(API_CONFIG.ENDPOINTS.AUTH.ME);
  }

  async logout() {
    try {
      const result = await this.request(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST'
      });
      this.clearTokens();
      return result;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  // ==================== 👤 USER PROFILE (4 endpoints) ====================
  
  async getUserProfile() {
    return await this.getCached(API_CONFIG.ENDPOINTS.USER.PROFILE);
  }

  async updateUserProfile(payload) {
    const result = await this.request(API_CONFIG.ENDPOINTS.USER.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    // Clear profile cache
    this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.USER.PROFILE));
    
    return result;
  }

  async changePassword(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.USER.PASSWORD, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async getUserDashboard() {
    return await this.getCached(API_CONFIG.ENDPOINTS.USER.DASHBOARD);
  }

  // ==================== 🍕 BREAK MANAGEMENT (6 endpoints) ====================
  
  async startBreak(payload = { break_type: 'regular' }) {
    const result = await this.request(API_CONFIG.ENDPOINTS.BREAKS.START, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    // Clear break-related caches
    this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.BREAKS.STATUS));
    
    return result;
  }

  async endBreak() {
    const result = await this.request(API_CONFIG.ENDPOINTS.BREAKS.END, {
      method: 'POST'
    });
    
    // Clear break-related caches
    this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.BREAKS.STATUS));
    
    return result;
  }

  async getBreakStatus() {
    return await this.getCached(API_CONFIG.ENDPOINTS.BREAKS.STATUS, {}, { cacheTTL: 30000 }); // 30 seconds
  }

  async getBreakHistory(params = {}) {
    return await this.getCached(API_CONFIG.ENDPOINTS.BREAKS.HISTORY, params);
  }

  async getBreakSummary(date) {
    return await this.getCached(API_CONFIG.ENDPOINTS.BREAKS.SUMMARY, { date });
  }

  // ==================== ⏰ TIME TRACKING (7 endpoints) ====================
  
  async clockIn(payload) {
    // Prefer new endpoint if available
    const endpoint = API_CONFIG.ENDPOINTS.TIME_TRACKING?.CLOCK_IN || API_CONFIG.ENDPOINTS.TIME.CLOCK_IN;
    const options = { method: 'POST' };
    if (payload && (typeof payload === 'object') && Object.keys(payload).length > 0) {
      options.body = JSON.stringify(payload);
    }
    const result = await this.request(endpoint, options);
    
    // Clear time-related caches (both legacy and time-tracking endpoints)
    try {
      this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.STATUS));
    } catch (_) {}
    try {
      if (API_CONFIG.ENDPOINTS.TIME_TRACKING?.STATUS) {
        this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME_TRACKING.STATUS));
      }
    } catch (_) {}
    try {
      this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.ENTRIES));
    } catch (_) {}
    try {
      if (API_CONFIG.ENDPOINTS.TIME_TRACKING?.ENTRIES) {
        this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME_TRACKING.ENTRIES));
      }
    } catch (_) {}
    
    return result;
  }

  async clockOut(payload) {
    const endpoint = API_CONFIG.ENDPOINTS.TIME_TRACKING?.CLOCK_OUT || API_CONFIG.ENDPOINTS.TIME.CLOCK_OUT;
    const options = { method: 'POST' };
    if (payload && (typeof payload === 'object') && Object.keys(payload).length > 0) {
      options.body = JSON.stringify(payload);
    }
    const result = await this.request(endpoint, options);
    
    // Clear time-related caches (both legacy and time-tracking endpoints)
    try {
      this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.STATUS));
    } catch (_) {}
    try {
      if (API_CONFIG.ENDPOINTS.TIME_TRACKING?.STATUS) {
        this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME_TRACKING.STATUS));
      }
    } catch (_) {}
    try {
      this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.ENTRIES));
    } catch (_) {}
    try {
      if (API_CONFIG.ENDPOINTS.TIME_TRACKING?.ENTRIES) {
        this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME_TRACKING.ENTRIES));
      }
    } catch (_) {}
    
    return result;
  }

  async getTimeStatus() {
    const endpoint = API_CONFIG.ENDPOINTS.TIME_TRACKING?.STATUS || API_CONFIG.ENDPOINTS.TIME.STATUS;
    return await this.getCached(endpoint, {}, { cacheTTL: 30000 }); // 30 seconds
  }

  async getTimeEntries(params = {}) {
    const endpoint = API_CONFIG.ENDPOINTS.TIME_TRACKING?.ENTRIES || API_CONFIG.ENDPOINTS.TIME.ENTRIES;
    return await this.getCached(endpoint, params);
  }

  async createManualTimeEntry(payload) {
    const result = await this.request(API_CONFIG.ENDPOINTS.TIME.MANUAL_ENTRY, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    // Clear time entries cache
    this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.ENTRIES));
    
    return result;
  }

  async updateTimeEntry(entryId, payload) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.TIME.ENTRY_BY_ID, { entry_id: entryId });
    const result = await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    // Clear time entries cache
    this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.ENTRIES));
    
    return result;
  }

  async deleteTimeEntry(entryId) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.TIME.ENTRY_BY_ID, { entry_id: entryId });
    const result = await this.request(endpoint, {
      method: 'DELETE'
    });
    
    // Clear time entries cache
    this.clearCache(this.generateCacheKey(API_CONFIG.ENDPOINTS.TIME.ENTRIES));
    
    return result;
  }

  // ==================== ✅ APPROVAL WORKFLOWS (5 endpoints) ====================
  
  async getPendingApprovals(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.APPROVALS.PENDING}${query}`);
  }

  async approveTimeEntry(entryId, payload = {}) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.APPROVALS.APPROVE, { entry_id: entryId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async rejectTimeEntry(entryId, payload) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.APPROVALS.REJECT, { entry_id: entryId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async bulkApproveEntries(entryIds) {
    return await this.request(API_CONFIG.ENDPOINTS.APPROVALS.BULK_APPROVE, {
      method: 'POST',
      body: JSON.stringify({ entry_ids: entryIds })
    });
  }

  async getApprovalHistory(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.APPROVALS.HISTORY}${query}`);
  }

  // ==================== 📊 ANALYTICS (5 endpoints) ====================
  
  async getAnalyticsOverview() {
    return await this.request(API_CONFIG.ENDPOINTS.ANALYTICS.OVERVIEW);
  }

  async getProductivityMetrics(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.ANALYTICS.PRODUCTIVITY}${query}`);
  }

  async getAttendanceAnalytics(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.ANALYTICS.ATTENDANCE}${query}`);
  }

  async getOvertimeAnalytics(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.ANALYTICS.OVERTIME}${query}`);
  }

  async getTeamPerformance(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.ANALYTICS.TEAM_PERFORMANCE}${query}`);
  }

  // ==================== 📈 REPORTS (4 endpoints) ====================
  
  async generateTimesheetReport(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.REPORTS.TIMESHEET}${query}`);
  }

  async generateAttendanceReport(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.REPORTS.ATTENDANCE}${query}`);
  }

  async generateProductivityReport(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.REPORTS.PRODUCTIVITY}${query}`);
  }

  async exportReports(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.REPORTS.EXPORT}${query}`);
  }

  // ==================== ⚙️ SETTINGS (8 endpoints) ====================
  
  async getProfileSettings() {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.PROFILE);
  }

  async updateProfileSettings(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async getNotificationSettings() {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.NOTIFICATIONS);
  }

  async updateNotificationSettings(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.NOTIFICATIONS, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async getWorkPreferences() {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.WORK_PREFERENCES);
  }

  async updateWorkPreferences(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.WORK_PREFERENCES, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async getSystemSettings() {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.SYSTEM);
  }

  async updateSystemSettings(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.SETTINGS.SYSTEM, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // ==================== 💰 PAYROLL (5 endpoints) ====================
  
  async getPayrollSummary(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.PAYROLL.SUMMARY}${query}`);
  }

  async getPayrollHistory(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.PAYROLL.HISTORY}${query}`);
  }

  async generatePayroll(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.PAYROLL.GENERATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getPayRates() {
    return await this.request(API_CONFIG.ENDPOINTS.PAYROLL.RATES);
  }

  async updatePayRates(userId, payload) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.PAYROLL.UPDATE_RATES, { user_id: userId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // ==================== 🔔 NOTIFICATIONS (6 endpoints) ====================
  
  async listNotifications(params = {}) {
    const query = buildQueryString(params);
    return await this.request(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST}${query}`);
  }

  async getUnreadCount() {
    return await this.request(API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  }

  async markNotificationRead(notificationId) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ, { notification_id: notificationId });
    return await this.request(endpoint, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return await this.request(API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
      method: 'PUT'
    });
  }

  async deleteNotification(notificationId) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.NOTIFICATIONS.DELETE, { notification_id: notificationId });
    return await this.request(endpoint, {
      method: 'DELETE'
    });
  }

  async updateNotificationPreferences(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.NOTIFICATIONS.PREFERENCES, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ==================== 👥 USER MANAGEMENT (5 endpoints) ====================
  
  async listUsers() {
    return await this.request(API_CONFIG.ENDPOINTS.USERS.LIST);
  }

  async createUser(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.USERS.CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getUserById(userId) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.USERS.BY_ID, { user_id: userId });
    return await this.request(endpoint);
  }

  async updateUser(userId, payload) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.USERS.BY_ID, { user_id: userId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteUser(userId) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.USERS.BY_ID, { user_id: userId });
    return await this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // ==================== 👨‍👩‍👧‍👦 TEAM MANAGEMENT (3 endpoints) ====================
  
  async listTeams() {
    return await this.request(API_CONFIG.ENDPOINTS.TEAMS.LIST);
  }

  async createTeam(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.TEAMS.CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async assignTeamManager(teamId, payload) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.TEAMS.ASSIGN_MANAGER, { team_id: teamId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // ==================== 📁 PROJECT MANAGEMENT (2 endpoints) ====================
  
  async listProjects() {
    return await this.request(API_CONFIG.ENDPOINTS.PROJECTS.LIST);
  }

  async createProject(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.PROJECTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ==================== ✓ TASK MANAGEMENT (3 endpoints) ====================
  
  async listTasks() {
    return await this.request(API_CONFIG.ENDPOINTS.TASKS.LIST);
  }

  async createTask(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.TASKS.CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateTaskStatus(taskId, status) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.TASKS.UPDATE_STATUS, { task_id: taskId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // ==================== 📅 SCHEDULE MANAGEMENT (3 endpoints) ====================
  
  async listSchedules() {
    return await this.request(API_CONFIG.ENDPOINTS.SCHEDULES.LIST);
  }

  async createSchedule(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.SCHEDULES.CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createBatchSchedules(schedules) {
    return await this.request(API_CONFIG.ENDPOINTS.SCHEDULES.CREATE_BATCH, {
      method: 'POST',
      body: JSON.stringify({ schedules })
    });
  }

  // ==================== ⏱️ WORKING TIMES (2 endpoints) ====================
  
  async listWorkingTimes() {
    return await this.request(API_CONFIG.ENDPOINTS.WORKING_TIMES.LIST);
  }

  async logUnpaidOvertime(payload) {
    return await this.request(API_CONFIG.ENDPOINTS.WORKING_TIMES.LOG_UNPAID_OVERTIME, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ==================== ADDITIONAL ENHANCED METHODS ====================
  
  /**
   * Preload critical data for better UX
   * @param {Array} endpoints - Array of endpoints to preload
   */
  async preloadData(endpoints) {
    const promises = endpoints.map(endpoint => 
      this.getCached(endpoint).catch(error => {
        console.warn(`[API] Preload failed for ${endpoint}:`, error);
        return null;
      })
    );
    
    return await Promise.allSettled(promises);
  }

  /**
   * Get offline data from cache
   * @param {string} endpoint - API endpoint
   * @returns {any|null} - Cached data or null
   */
  getOfflineData(endpoint) {
    return this.getCache(this.generateCacheKey(endpoint));
  }

  /**
   * Check if data is available offline
   * @param {string} endpoint - API endpoint
   * @returns {boolean} - True if data is cached
   */
  isOfflineAvailable(endpoint) {
    return this.getCache(this.generateCacheKey(endpoint)) !== null;
  }

  // ==================== ADDITIONAL API METHODS ====================
  
  /**
   * Get notifications (for real-time service)
   */
  async getNotifications(params = {}) {
    return await this.listNotifications(params);
  }

  /**
   * Get current status (for real-time service)
   */
  async getCurrentStatus() {
    return await this.getTimeStatus();
  }

  /**
   * Get team members (for manager dashboard)
   */
  async getTeamMembers() {
    return await this.listUsers();
  }

  // ==================== LEGACY ENDPOINTS (Backward Compatibility) ====================
  
  async getUserClock(userID) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.CLOCKS.BY_USER, { userID });
    return await this.request(endpoint);
  }

  async clockInOut(userID, status) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.CLOCKS.BY_USER, { userID });
    return await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  async getUserWorkingTimes(userID) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.WORKINGTIME.BY_USER, { userID });
    return await this.request(endpoint);
  }

  async listRoles() {
    return await this.request(API_CONFIG.ENDPOINTS.ROLES.LIST);
  }

  async updateUserPermissions(userId, payload) {
    const endpoint = replacePathParams(API_CONFIG.ENDPOINTS.PERMISSIONS.UPDATE, { user_id: userId });
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }
}

// Export singleton instance
export const apiService = new TicktraxApiService();
export default apiService;