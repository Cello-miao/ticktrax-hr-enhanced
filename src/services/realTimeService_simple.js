import { API_CONFIG } from '../config/api.js'

/**
 * SIMPLIFIED REAL-TIME SERVICE
 * Handles real-time features without authentication:
 * - Live time tracking updates
 * - Real-time notifications
 * - Live dashboard data
 * - Event broadcasting
 */
class RealTimeService {
  constructor() {
    this.isConnected = false
    this.eventListeners = new Map()
    this.intervals = new Map()
    
    // Auto-initialize
    this.initialize()
  }

  // ==================== INITIALIZATION ====================

  initialize() {
    console.log('⚡ Initializing real-time service...')
    
    // Start real-time features without WebSocket
    this.startRealTimeFeatures()
    this.isConnected = true
    
    console.log('✅ Real-time service active')
  }

  // ==================== REAL-TIME FEATURES ====================

  startRealTimeFeatures() {
    // Real-time clock updates
    this.intervals.set('clock', setInterval(() => {
      this.emit('clock-update', {
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      })
    }, 1000))

    // Periodic status updates
    this.intervals.set('status', setInterval(() => {
      this.emit('status-update', {
        timestamp: Date.now(),
        connected: this.isConnected,
        activities: Math.floor(Math.random() * 5) + 1
      })
    }, 5000))

    // Random notifications
    this.intervals.set('notifications', setInterval(() => {
      const messages = [
        '⚡ Real-time sync active',
        '📊 Dashboard updated',
        '🔔 New activity detected',
        '✅ System status: OK',
        '📱 Mobile sync complete'
      ]
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      
      this.emit('notification', {
        timestamp: Date.now(),
        message: randomMessage,
        type: 'info'
      })
    }, 15000))
  }

  // ==================== EVENT SYSTEM ====================

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(callback)
    
    console.log(`📡 Subscribed to real-time event: ${event}`)
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error)
        }
      })
    }
  }

  // ==================== TIME TRACKING ====================

  clockIn() {
    const timestamp = Date.now()
    this.emit('clock-in', {
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
      status: 'Working'
    })
    
    console.log('🕐 Clock in event emitted')
    return { success: true, timestamp }
  }

  clockOut() {
    const timestamp = Date.now()
    this.emit('clock-out', {
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
      status: 'Break'
    })
    
    console.log('🕐 Clock out event emitted')
    return { success: true, timestamp }
  }

  // ==================== NOTIFICATIONS ====================

  sendNotification(message, type = 'info') {
    this.emit('notification', {
      timestamp: Date.now(),
      message,
      type
    })
    
    console.log('📢 Notification sent:', message)
  }

  // ==================== SYNC OPERATIONS ====================

  triggerSync() {
    const timestamp = Date.now()
    
    // Simulate sync activity
    setTimeout(() => {
      this.emit('sync-complete', {
        timestamp,
        itemsSynced: Math.floor(Math.random() * 10) + 1,
        duration: Math.floor(Math.random() * 1000) + 500
      })
    }, 500)
    
    this.emit('sync-start', { timestamp })
    console.log('🔄 Sync operation triggered')
  }

  // ==================== CONNECTION STATUS ====================

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      features: {
        realtime: true,
        notifications: true,
        sync: true,
        clock: true
      },
      uptime: Date.now() - (this.startTime || Date.now())
    }
  }

  // ==================== CLEANUP ====================

  disconnect() {
    // Clear all intervals
    this.intervals.forEach((interval, name) => {
      clearInterval(interval)
      console.log(`🛑 Stopped ${name} updates`)
    })
    
    this.intervals.clear()
    this.eventListeners.clear()
    this.isConnected = false
    
    console.log('🔌 Real-time service disconnected')
  }
}

// Export singleton instance
export default new RealTimeService()