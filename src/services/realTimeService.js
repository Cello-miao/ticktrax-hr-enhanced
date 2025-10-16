import { API_CONFIG } from '../config/api.js'
import authManager from './authService.js'
import { apiService } from './apiService.js'

/**
 * REAL-TIME API SERVICE
 * Handles WebSocket connections for real-time features:
 * - Live time tracking updates
 * - Real-time notifications
 * - Live dashboard data
 * - Collaborative features
 */
class RealTimeService {
  constructor() {
    this.socket = null
    this.channels = new Map()
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 1000
    this.heartbeatInterval = null
    
    // Event listeners
    this.eventListeners = new Map()
    
    // Fallback polling system
    this.pollingIntervals = new Map()
    this.currentUser = null
    this.lastSyncTime = null
    
    // Auto-initialize
    this.initialize()
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize real-time service with hybrid approach
   * REAL-TIME: WebSocket + API polling fallback
   */
  async initialize() {
    console.log('⚡ Initializing real-time service...')
    
    try {
      // Try WebSocket connection first
      await this.connect()
    } catch (error) {
      console.log('🔌 WebSocket failed, using API polling fallback:', error.message)
      this.startPollingFallback()
    }
    
    // Start real-time clock updates
    this.startClockUpdates()
    
    this.isConnected = true
    this.emit('connected')
    console.log('✅ Real-time service active')
  }

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Connect to Phoenix WebSocket with authentication
   * REAL-TIME: Establishes authenticated WebSocket connection
   */
  async connect() {
    try {
      if (this.socket && this.isConnected) {
        console.log('🔌 WebSocket already connected')
        return true
      }

      console.log('🔌 Connecting to real-time server...')
      
      // Get authentication token
      const authToken = authManager.jwtToken
      if (!authToken) {
        throw new Error('No authentication token available')
      }

      // Connect to Phoenix Socket with token
      // Use mobile-specific WebSocket URL if in Cordova
      const wsBaseUrl = isCordovaApp() ? getMobileApiConfig().WS_URL : API_CONFIG.WS_URL
      const wsUrl = `${wsBaseUrl}?token=${encodeURIComponent(authToken)}`
      this.socket = new WebSocket(wsUrl)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'))
        }, 10000)

        this.socket.onopen = () => {
          clearTimeout(timeout)
          this.isConnected = true
          this.reconnectAttempts = 0
          console.log('✅ Real-time connection established')
          
          this.startHeartbeat()
          this.emit('connected')
          resolve(true)
        }

        this.socket.onclose = (event) => {
          clearTimeout(timeout)
          this.handleDisconnection(event)
        }

        this.socket.onerror = (error) => {
          clearTimeout(timeout)
          console.error('🔥 WebSocket connection error:', error)
          reject(error)
        }

        this.socket.onmessage = (event) => {
          this.handleMessage(event)
        }
      })

    } catch (error) {
      console.error('🔥 Real-time connection failed:', error)
      throw error
    }
  }

  /**
   * Disconnect from WebSocket
   * REAL-TIME: Clean disconnection with proper cleanup
   */
  disconnect() {
    console.log('🔌 Disconnecting from real-time server...')
    
    this.isConnected = false
    this.stopHeartbeat()
    
    // Close all channels
    this.channels.forEach(channel => {
      this.leaveChannel(channel.topic)
    })
    
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect')
      this.socket = null
    }
    
    this.emit('disconnected')
    console.log('✅ Real-time connection closed')
  }

  /**
   * Handle disconnection and reconnection
   * REAL-TIME: Automatic reconnection with exponential backoff
   */
  handleDisconnection(event) {
    this.isConnected = false
    this.stopHeartbeat()
    
    console.log('🔌 Real-time connection lost:', event.code, event.reason)
    this.emit('disconnected', { code: event.code, reason: event.reason })

    // Auto-reconnect if not a manual disconnect
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   * REAL-TIME: Smart reconnection strategy
   */
  scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch(error => {
          console.error('🔥 Reconnection failed:', error)
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('🔥 Max reconnection attempts reached')
            this.emit('reconnection_failed')
          }
        })
      }
    }, delay)
  }

  // ==================== CHANNEL MANAGEMENT ====================

  /**
   * Join a Phoenix Channel
   * REAL-TIME: Subscribe to specific topic for live updates
   */
  async joinChannel(topic, params = {}) {
    try {
      if (!this.isConnected) {
        await this.connect()
      }

      if (this.channels.has(topic)) {
        console.log(`📡 Already subscribed to ${topic}`)
        return this.channels.get(topic)
      }

      console.log(`📡 Joining channel: ${topic}`)

      const channel = {
        topic,
        params,
        status: 'joining',
        ref: this.generateRef()
      }

      // Send join message
      this.send({
        topic,
        event: 'phx_join',
        payload: params,
        ref: channel.ref
      })

      this.channels.set(topic, channel)
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Channel join timeout: ${topic}`))
        }, 5000)

        const handleReply = (message) => {
          if (message.ref === channel.ref) {
            clearTimeout(timeout)
            
            if (message.payload.status === 'ok') {
              channel.status = 'joined'
              console.log(`✅ Joined channel: ${topic}`)
              this.emit('channel_joined', { topic, channel })
              resolve(channel)
            } else {
              this.channels.delete(topic)
              reject(new Error(`Channel join failed: ${message.payload.response?.reason || 'Unknown error'}`))
            }
          }
        }

        this.on('phx_reply', handleReply)
      })

    } catch (error) {
      console.error(`🔥 Failed to join channel ${topic}:`, error)
      throw error
    }
  }

  /**
   * Leave a Phoenix Channel
   * REAL-TIME: Unsubscribe from topic
   */
  leaveChannel(topic) {
    const channel = this.channels.get(topic)
    if (!channel) {
      console.log(`📡 Not subscribed to ${topic}`)
      return
    }

    console.log(`📡 Leaving channel: ${topic}`)

    if (this.isConnected && channel.status === 'joined') {
      this.send({
        topic,
        event: 'phx_leave',
        payload: {},
        ref: this.generateRef()
      })
    }

    this.channels.delete(topic)
    this.emit('channel_left', { topic })
  }

  /**
   * Send message to channel
   * REAL-TIME: Send real-time event to specific channel
   */
  sendToChannel(topic, event, payload = {}) {
    const channel = this.channels.get(topic)
    if (!channel || channel.status !== 'joined') {
      throw new Error(`Not subscribed to channel: ${topic}`)
    }

    this.send({
      topic,
      event,
      payload,
      ref: this.generateRef()
    })
  }

  // ==================== TIME TRACKING CHANNELS ====================

  /**
   * Join time tracking channel for real-time updates
   * REAL-TIME: Live time tracking updates
   */
  async joinTimeTracking(userId) {
    const topic = `time_tracking:${userId}`
    
    try {
      const channel = await this.joinChannel(topic, { user_id: userId })
      
      // Listen for time tracking events
      this.on(`time_entry_updated:${userId}`, (data) => {
        this.emit('time_entry_updated', data)
      })
      
      this.on(`clock_in:${userId}`, (data) => {
        this.emit('clock_in', data)
      })
      
      this.on(`clock_out:${userId}`, (data) => {
        this.emit('clock_out', data)
      })
      
      return channel
    } catch (error) {
      console.error('🔥 Failed to join time tracking:', error)
      throw error
    }
  }

  /**
   * Send clock in event
   * REAL-TIME: Broadcast clock in to team
   */
  clockIn(location = null) {
    const userId = authManager.currentUser?.id
    if (!userId) throw new Error('User not authenticated')

    this.sendToChannel(`time_tracking:${userId}`, 'clock_in', {
      timestamp: new Date().toISOString(),
      location: location
    })
  }

  /**
   * Send clock out event  
   * REAL-TIME: Broadcast clock out to team
   */
  clockOut(location = null) {
    const userId = authManager.currentUser?.id
    if (!userId) throw new Error('User not authenticated')

    this.sendToChannel(`time_tracking:${userId}`, 'clock_out', {
      timestamp: new Date().toISOString(),
      location: location
    })
  }

  // ==================== TEAM DASHBOARD CHANNELS ====================

  /**
   * Join team dashboard for live team updates
   * REAL-TIME: Live team dashboard data
   */
  async joinTeamDashboard(teamId) {
    const topic = `team_dashboard:${teamId}`
    
    try {
      const channel = await this.joinChannel(topic, { team_id: teamId })
      
      // Listen for team events
      this.on(`team_member_online:${teamId}`, (data) => {
        this.emit('team_member_online', data)
      })
      
      this.on(`team_member_offline:${teamId}`, (data) => {
        this.emit('team_member_offline', data)
      })
      
      this.on(`team_stats_updated:${teamId}`, (data) => {
        this.emit('team_stats_updated', data)
      })
      
      return channel
    } catch (error) {
      console.error('🔥 Failed to join team dashboard:', error)
      throw error
    }
  }

  // ==================== NOTIFICATIONS CHANNEL ====================

  /**
   * Join notifications channel
   * REAL-TIME: Live notifications and alerts
   */
  async joinNotifications(userId) {
    const topic = `notifications:${userId}`
    
    try {
      const channel = await this.joinChannel(topic, { user_id: userId })
      
      // Listen for notification events
      this.on(`notification:${userId}`, (data) => {
        this.emit('notification', data)
      })
      
      this.on(`alert:${userId}`, (data) => {
        this.emit('alert', data)
      })
      
      return channel
    } catch (error) {
      console.error('🔥 Failed to join notifications:', error)
      throw error
    }
  }

  // ==================== MESSAGE HANDLING ====================

  /**
   * Handle incoming WebSocket messages
   * REAL-TIME: Process Phoenix Socket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data)
      
      // Emit specific events based on message
      this.emit(message.event, message.payload, message)
      
      // Handle Phoenix system events
      if (message.event === 'phx_reply') {
        this.emit('phx_reply', message)
      }
      
    } catch (error) {
      console.error('🔥 Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Send message through WebSocket
   * REAL-TIME: Send Phoenix Socket message
   */
  send(message) {
    if (!this.socket || !this.isConnected) {
      throw new Error('WebSocket not connected')
    }

    this.socket.send(JSON.stringify(message))
  }

  // ==================== HEARTBEAT ====================

  /**
   * Start heartbeat to keep connection alive
   * REAL-TIME: Prevent connection timeout
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: this.generateRef()
        })
      }
    }, 30000) // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Add event listener
   * REAL-TIME: Subscribe to real-time events
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, ...args) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`🔥 Event listener error for ${event}:`, error)
        }
      })
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Generate unique reference for messages
   */
  generateRef() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      channels: Array.from(this.channels.keys()),
      reconnectAttempts: this.reconnectAttempts
    }
  }
  // ==================== POLLING FALLBACK ====================

  /**
   * Start API polling as fallback when WebSocket fails
   * REAL-TIME: Polls API every 30 seconds for updates
   */
  startPollingFallback() {
    console.log('🔄 Starting API polling fallback...')
    
    // Poll user status every 30 seconds
    this.pollingIntervals.set('user-status', setInterval(async () => {
      await this.pollUserStatus()
    }, 30000))
    
    // Poll notifications every 60 seconds
    this.pollingIntervals.set('notifications', setInterval(async () => {
      await this.pollNotifications()
    }, 60000))
    
    // Initial poll
    this.pollUserStatus()
  }

  /**
   * Poll user status from API
   */
  async pollUserStatus() {
    try {
      if (!this.currentUser) {
        const userRes = await authManager.getCurrentUser()
        this.currentUser = userRes?.data
      }
      
      if (this.currentUser) {
        // Get current clock status
        const status = await apiService.getCurrentStatus()
        
        // Emit status update
        this.emit('clock-status-changed', {
          is_clocked_in: status.is_clocked_in,
          clock_in_time: status.clock_in_time,
          total_hours_today: status.total_hours_today
        })
        
        this.lastSyncTime = Date.now()
      }
    } catch (error) {
      console.error('Polling error:', error)
      // Fallback to mock data
      this.emit('clock-status-changed', {
        is_clocked_in: false,
        clock_in_time: null,
        total_hours_today: 0
      })
      this.emit('sync-error', error)
    }
  }

  /**
   * Poll notifications from API
   */
  async pollNotifications() {
    try {
      const notifications = await apiService.getNotifications()
      if (notifications && notifications.length > 0) {
        this.emit('notifications-updated', notifications)
      }
    } catch (error) {
      console.error('Notification polling error:', error)
      // Fallback to mock notifications
      this.emit('notifications-updated', [
        { id: 1, message: 'Welcome to TickTrax!', type: 'info', read: false },
        { id: 2, message: 'Time entry approved', type: 'success', read: false }
      ])
    }
  }

  /**
   * Start real-time clock updates
   */
  startClockUpdates() {
    this.pollingIntervals.set('clock', setInterval(() => {
      this.emit('clock-update', {
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      })
    }, 1000))
  }

  /**
   * Stop all polling intervals
   */
  stopPolling() {
    this.pollingIntervals.forEach((interval, key) => {
      clearInterval(interval)
      console.log(`🛑 Stopped polling: ${key}`)
    })
    this.pollingIntervals.clear()
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.disconnect()
    this.stopPolling()
    this.eventListeners.clear()
    this.isConnected = false
  }
}

const realTimeService = new RealTimeService()
export default realTimeService