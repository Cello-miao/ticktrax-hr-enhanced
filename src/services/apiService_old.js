// Comprehensive API Service for Gotham Time Manager
import { API_CONFIG, buildApiUrl } from '../config/api.js';
import { mockApiService } from './mockApiService.js';

class ApiService {
  constructor() {
    // Use mobile-specific API configuration if in Cordova
    if (isCordovaApp()) {
      const mobileConfig = getMobileApiConfig();
      this.baseURL = mobileConfig.BASE_URL;
    } else {
      this.baseURL = API_CONFIG.BASE_URL;
    }
    this.jwtToken = null;
    this.xsrfToken = null;
  }

  // Initialize tokens from localStorage
  initializeTokens() {
    this.jwtToken = localStorage.getItem('jwt_token');
    this.xsrfToken = localStorage.getItem('xsrf_token');
  }

  // Store tokens
  setTokens(jwtToken, xsrfToken) {
    this.jwtToken = jwtToken;
    this.xsrfToken = xsrfToken;
    localStorage.setItem('jwt_token', jwtToken);
    localStorage.setItem('xsrf_token', xsrfToken);
  }

  // Clear tokens
  clearTokens() {
    this.jwtToken = null;
    this.xsrfToken = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('xsrf_token');
  }

  // Get authentication headers
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    if (this.xsrfToken) {
      headers['x-csrf-token'] = this.xsrfToken; // Lowercase as backend expects
    }

    return headers;
  }

  // Make authenticated request
  async authenticatedRequest(endpoint, method = 'GET', body = null) {
    this.initializeTokens();
    
    const config = {
      method,
      headers: this.getAuthHeaders()
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          this.clearTokens();
          throw new Error('Authentication failed');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle empty responses (like DELETE)
      if (response.status === 204) {
        return { success: true };
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ==================== AUTHENTICATION ====================

  async login(credentials) {
    try {
      const loginUrl = `${this.baseURL}/users/sign_in?t=${Date.now()}`;
      console.log('🔍 Attempting login to:', loginUrl);
      console.log('🔍 Sending credentials:', credentials);
      console.log('🔍 Credentials JSON:', JSON.stringify(credentials));
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      this.setTokens(data.token, data.xsrf_token);
      
      return {
        success: true,
        data: {
          id: data.user_id,
          email: data.email,
          role: data.role,
          first_name: data.first_name || '',
          last_name: data.last_name || ''
        }
      };
    } catch (error) {
      console.warn('Real API not available, using mock data:', error.message);
      // Fallback to mock API service
      return await mockApiService.login(credentials);
    }
  }

  async logout() {
    try {
      await this.authenticatedRequest('/users/sign_out', 'POST');
      this.clearTokens();
      return { success: true };
    } catch (error) {
      this.clearTokens(); // Clear tokens even if logout fails
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      console.log('🔍 Calling GET /users/me endpoint...');
      const response = await this.authenticatedRequest('/users/me');
      console.log('✅ GET /users/me response:', response);
      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('❌ Get current user failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== USER MANAGEMENT ====================

  async getUsers() {
    try {
      const response = await this.authenticatedRequest('/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const response = await this.authenticatedRequest(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const response = await this.authenticatedRequest('/users', 'POST', { user: userData });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const response = await this.authenticatedRequest(`/users/${id}`, 'PUT', { user: userData });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      await this.authenticatedRequest(`/users/${id}`, 'DELETE');
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // ==================== TASK MANAGEMENT ====================

  async getTasks() {
    try {
      const response = await this.authenticatedRequest('/tasks');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTaskById(id) {
    try {
      const response = await this.authenticatedRequest(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createTask(taskData) {
    try {
      const response = await this.authenticatedRequest('/tasks', 'POST', { task: taskData });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(id, taskData) {
    try {
      const response = await this.authenticatedRequest(`/tasks/${id}`, 'PUT', { task: taskData });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(id) {
    try {
      await this.authenticatedRequest(`/tasks/${id}`, 'DELETE');
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getTasksByUser(userId) {
    try {
      const response = await this.authenticatedRequest(`/tasks/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== TASK STATUS UTILITIES ====================

  getTaskStatuses() {
    return {
      '1': { name: 'todo', color: 'gray', label: 'To Do' },
      '2': { name: 'in_progress', color: 'blue', label: 'In Progress' },
      '3': { name: 'under_review', color: 'orange', label: 'Under Review' },
      '4': { name: 'done', color: 'green', label: 'Done' }
    };
  }

  getTaskStatusLabel(status) {
    const statuses = this.getTaskStatuses();
    return statuses[status]?.label || 'Unknown';
  }

  getTaskStatusColor(status) {
    const statuses = this.getTaskStatuses();
    return statuses[status]?.color || 'gray';
  }

  // ==================== UTILITY METHODS ====================

  isAuthenticated() {
    this.initializeTokens();
    return !!(this.jwtToken && this.xsrfToken);
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.status;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export default new ApiService();
