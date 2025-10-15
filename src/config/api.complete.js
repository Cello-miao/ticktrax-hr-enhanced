// Complete API Configuration - All 87 Endpoints from Postman Collection
// Aligned with Gotham Time Manager API

export const API_CONFIG = {
  // Base URL Configuration
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://batman-api-a20b3a37aa3c.herokuapp.com/api',
  
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  
  HEADERS: {
    AUTHORIZATION: 'Authorization',
    CSRF_TOKEN: 'x-csrf-token',
    CONTENT_TYPE: 'application/json'
  },

  ENDPOINTS: {
    // 🔐 AUTHENTICATION (4 endpoints)
    AUTH: {
      REGISTER: '/auth/register',           // POST - Register new user
      LOGIN: '/auth/login',                 // POST - Login and get JWT
      ME: '/auth/me',                       // GET - Get current user
      LOGOUT: '/auth/logout'                // POST - Logout
    },

    // 👤 USER PROFILE MANAGEMENT (4 endpoints)
    USER: {
      PROFILE: '/user/profile',             // GET, PUT - Get/Update profile
      PASSWORD: '/user/password',           // PUT - Change password
      DASHBOARD: '/user/dashboard'          // GET - Get user dashboard
    },

    // 🍕 BREAK MANAGEMENT (6 endpoints)
    BREAKS: {
      START: '/user/breaks/start',          // POST - Start break
      END: '/user/breaks/end',              // POST - End break
      STATUS: '/user/breaks/status',        // GET - Current break status
      HISTORY: '/user/breaks/history',      // GET - Break history (paginated)
      SUMMARY: '/user/breaks/summary'       // GET - Break summary for date
    },

    // ⏰ TIME TRACKING (7 endpoints)
    TIME: {
      CLOCK_IN: '/time/clock-in',           // POST - Clock in
      CLOCK_OUT: '/time/clock-out',         // POST - Clock out
      STATUS: '/time/status',               // GET - Current time status
      ENTRIES: '/time/entries',             // GET - Get time entries (paginated)
      MANUAL_ENTRY: '/time/manual-entry',   // POST - Create manual entry
      ENTRY_BY_ID: '/time/entries/:entry_id', // PUT, DELETE - Update/Delete entry
    },

    // New Time Tracking variant endpoints
    TIME_TRACKING: {
      STATUS: '/time-tracking/status',      // GET - Current time status (new path)
      CLOCK_IN: '/time-tracking/clock-in',  // POST - Clock in (new path)
      CLOCK_OUT: '/time-tracking/clock-out', // POST - Clock out (new path)
      ENTRIES: '/time-tracking/entries'     // GET - Time entries (new path)
    },

    // ✅ APPROVAL WORKFLOWS (5 endpoints)
    APPROVALS: {
      PENDING: '/approvals/pending',        // GET - Get pending approvals
      APPROVE: '/approvals/:entry_id/approve',     // PUT - Approve entry
      REJECT: '/approvals/:entry_id/reject',       // PUT - Reject entry
      BULK_APPROVE: '/approvals/bulk-approve',     // POST - Bulk approve
      HISTORY: '/approvals/history'         // GET - Approval history
    },

    // 📊 ANALYTICS (5 endpoints)
    ANALYTICS: {
      OVERVIEW: '/analytics/overview',      // GET - Analytics overview
      PRODUCTIVITY: '/analytics/productivity', // GET - Productivity metrics
      ATTENDANCE: '/analytics/attendance',  // GET - Attendance analytics
      OVERTIME: '/analytics/overtime',      // GET - Overtime analytics
      TEAM_PERFORMANCE: '/analytics/team-performance' // GET - Team performance
    },

    // 📈 REPORTS (4 endpoints)
    REPORTS: {
      TIMESHEET: '/reports/timesheet',      // GET - Generate timesheet
      ATTENDANCE: '/reports/attendance',    // GET - Attendance report
      PRODUCTIVITY: '/reports/productivity', // GET - Productivity report
      EXPORT: '/reports/export'             // GET - Export reports
    },

    // ⚙️ SETTINGS (8 endpoints)
    SETTINGS: {
      PROFILE: '/settings/profile',         // GET, PUT - Profile settings
      NOTIFICATIONS: '/settings/notifications', // GET, PUT - Notification settings
      WORK_PREFERENCES: '/settings/work-preferences', // GET, PUT - Work preferences
      SYSTEM: '/settings/system'            // GET, PUT - System settings (Admin)
    },

    // 💰 PAYROLL (5 endpoints)
    PAYROLL: {
      SUMMARY: '/payroll/summary',          // GET - Payroll summary
      HISTORY: '/payroll/history',          // GET - Payroll history
      GENERATE: '/payroll/generate',        // POST - Generate payroll (Admin)
      RATES: '/payroll/rates',              // GET - Get pay rates
      UPDATE_RATES: '/payroll/rates/:user_id' // PUT - Update pay rates (Admin)
    },

    // 🔔 NOTIFICATIONS (6 endpoints)
    NOTIFICATIONS: {
      LIST: '/notifications',               // GET - List notifications
      UNREAD_COUNT: '/notifications/unread-count', // GET - Unread count
      MARK_READ: '/notifications/:notification_id/read', // PUT - Mark as read
      MARK_ALL_READ: '/notifications/mark-all-read', // PUT - Mark all as read
      DELETE: '/notifications/:notification_id', // DELETE - Delete notification
      PREFERENCES: '/notifications/preferences' // POST - Update preferences
    },

    // 👥 USER MANAGEMENT (5 endpoints)
    USERS: {
      LIST: '/users',                       // GET - List all users
      CREATE: '/users',                     // POST - Create user
      BY_ID: '/users/:user_id',             // GET, PUT, DELETE - Get/Update/Delete user
    },

    // 👨‍👩‍👧‍👦 TEAM MANAGEMENT (3 endpoints)
    TEAMS: {
      LIST: '/teams',                       // GET - List teams
      CREATE: '/teams',                     // POST - Create team
      ASSIGN_MANAGER: '/teams/:team_id/assign_manager' // PUT - Assign manager
    },

    // 📁 PROJECT MANAGEMENT (2 endpoints)
    PROJECTS: {
      LIST: '/projects',                    // GET - List projects
      CREATE: '/projects'                   // POST - Create project
    },

    // ✓ TASK MANAGEMENT (3 endpoints)
    TASKS: {
      LIST: '/tasks',                       // GET - List tasks
      CREATE: '/tasks',                     // POST - Create task
      UPDATE_STATUS: '/tasks/:task_id/status' // PUT - Update task status
    },

    // 📅 SCHEDULE MANAGEMENT (3 endpoints)
    SCHEDULES: {
      LIST: '/schedules',                   // GET - List schedules
      CREATE: '/schedules',                 // POST - Create schedule
      CREATE_BATCH: '/schedules/create_batch' // POST - Batch create schedules
    },

    // ⏱️ WORKING TIMES (2 endpoints)
    WORKING_TIMES: {
      LIST: '/working_times',               // GET - List working times
      LOG_UNPAID_OVERTIME: '/logs/overtime/unpaid' // POST - Log unpaid overtime
    },

    // Legacy endpoints (for backward compatibility)
    CLOCKS: {
      BY_USER: '/clocks/:userID'            // GET, POST
    },
    WORKINGTIME: {
      BY_USER: '/workingtime/:userID'       // GET
    },
    ROLES: {
      LIST: '/roles'                        // GET
    },
    PERMISSIONS: {
      UPDATE: '/permissions/:user_id'       // PUT
    },
    LOGS: {
      UNPAID_OVERTIME: '/logs/overtime/unpaid' // POST
    },
    AUDIT: {
      NIGHT_SHIFT_ALERT: '/audit/night_shift_alert',
      PRESENCE_VERIFICATION: '/audit/presence_verification',
      RESOLVE_DISCREPANCY: '/audit/discrepancy/resolve'
    },
    SKILLS: {
      LIST: '/skills',
      ASSIGN_TO_USER: '/users/:userid/skills/:skillid',
      CREATE: '/skills'
    },
    TIMESHEETS: {
      VALIDATE: '/timesheets/:id/validate'
    },
    INTEGRATIONS: {
      BATSIGNAL: '/integration/batsignal',
      LIST: '/integrations'
    }
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to replace path parameters
export const replacePathParams = (endpoint, params = {}) => {
  let url = endpoint;
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, String(params[key]));
  });
  return url;
};

// Helper function to build query string
export const buildQueryString = (params = {}) => {
  const filtered = Object.entries(params).filter(([_, v]) => v !== null && v !== undefined);
  if (filtered.length === 0) return '';
  return '?' + new URLSearchParams(filtered).toString();
};

// Task status constants
export const TASK_STATUS = {
  TODO: 1,
  IN_PROGRESS: 2,
  UNDER_REVIEW: 3,
  DONE: 4
};

export const TASK_STATUS_LABELS = {
  1: 'To Do',
  2: 'In Progress',
  3: 'Under Review',
  4: 'Done'
};

// Approval status constants
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Break types
export const BREAK_TYPES = {
  REGULAR: 'regular',
  LUNCH: 'lunch',
  PERSONAL: 'personal'
};

// Report formats
export const REPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv'
};

export default API_CONFIG;

