/**
 * CORDOVA MOBILE APP INTEGRATION
 * Complete integration for native mobile features
 */

class CordovaIntegration {
  constructor() {
    this.isReady = false;
    this.device = null;
    this.platform = null;
    this.currentPosition = null;
    this.networkStatus = 'unknown';
    
    this.initialize();
  }

  // Initialize Cordova
  initialize() {
    if (this.isCordova()) {
      document.addEventListener('deviceready', () => {
        console.log('📱 Cordova Device Ready!');
        this.onDeviceReady();
      }, false);
    } else {
      console.log('🌐 Running in browser mode');
      this.isReady = true;
    }
  }

  // Check if running in Cordova
  isCordova() {
    return !!(window.cordova || window.phonegap || window.PhoneGap);
  }

  // Device ready handler
  onDeviceReady() {
    this.isReady = true;
    
    // Get device info
    if (window.device) {
      this.device = {
        platform: window.device.platform,
        version: window.device.version,
        uuid: window.device.uuid,
        model: window.device.model,
        manufacturer: window.device.manufacturer
      };
      this.platform = window.device.platform.toLowerCase();
      console.log('📱 Device:', this.device);
    }

    // Setup plugins
    this.setupStatusBar();
    this.setupNetwork();
    this.setupBackButton();
    this.setupDeepLinks();

    // Start a lightweight background watch so we have a last-known position
    try {
      this.locationWatchId = this.watchLocation(() => {});
    } catch (e) {
      console.warn('📍 Failed to start background location watch:', e);
    }
    
    console.log('✅ Cordova fully initialized');
  }

  // Wait until Cordova is ready (no-op in browser). Rejects after timeout.
  async waitUntilReady(timeoutMs = 8000) {
    if (!this.isCordova()) return true;
    if (this.isReady) return true;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Cordova not ready (timeout)')), timeoutMs);
      document.addEventListener('deviceready', () => {
        clearTimeout(timer);
        resolve(true);
      }, { once: true });
    });
  }

  // ==================== STATUS BAR ====================

  setupStatusBar() {
    if (window.StatusBar) {
      // Style the status bar
      if (this.platform === 'ios') {
        window.StatusBar.overlaysWebView(false);
        window.StatusBar.styleDefault();
      } else if (this.platform === 'android') {
        window.StatusBar.backgroundColorByHexString('#2563eb'); // Primary blue
        window.StatusBar.styleLightContent();
      }
      console.log('📱 Status bar configured');
    }
  }

  // ==================== GEOLOCATION ====================

  async requestLocationPermission() {
    try {
      if (!window.cordova || !cordova.plugins || !cordova.plugins.permissions) return true;
      const permissions = cordova.plugins.permissions;
      const fine = permissions.ACCESS_FINE_LOCATION;
      const coarse = permissions.ACCESS_COARSE_LOCATION;

      const has = await new Promise((resolve) => {
        permissions.checkPermission(fine, (status) => resolve(!!status.hasPermission), () => resolve(false));
      });
      if (has) return true;

      const granted = await new Promise((resolve) => {
        permissions.requestPermissions([fine, coarse], (status) => {
          try {
            resolve(!!status.hasPermission);
          } catch (_) {
            resolve(false);
          }
        }, () => resolve(false));
      });
      return !!granted;
    } catch (e) {
      console.warn('🔐 Location permission request failed or unavailable:', e);
      return true; // don't block on permission helper
    }
  }

  async ensureLocationServicesEnabled() {
    try {
      // If diagnostic plugin not available, just return true
      if (!window.cordova || !window.cordova.plugins || !window.cordova.plugins.diagnostic) return true;
      const diagnostic = window.cordova.plugins.diagnostic;
      const enabled = await new Promise((resolve) => {
        diagnostic.isLocationEnabled((res) => resolve(!!res), () => resolve(false));
      });
      if (enabled) return true;
      // Attempt to request turning on location services (Android)
      if (diagnostic.switchToLocationSettings) {
        diagnostic.switchToLocationSettings();
      }
      return false;
    } catch (e) {
      console.warn('🧭 Unable to verify/enable location services:', e);
      return true; // don't block if the helper fails
    }
  }

  // Diagnostics: check if location services are enabled (no side effects)
  async isLocationEnabled() {
    try {
      if (!window.cordova || !window.cordova.plugins || !window.cordova.plugins.diagnostic) return true;
      const diagnostic = window.cordova.plugins.diagnostic;
      return await new Promise((resolve) => {
        diagnostic.isLocationEnabled((res) => resolve(!!res), () => resolve(false));
      });
    } catch (_) {
      return true;
    }
  }

  // Diagnostics: check location permission without prompting (Android)
  async checkLocationPermission() {
    try {
      if (!window.cordova || !cordova.plugins || !cordova.plugins.permissions) return true;
      const permissions = cordova.plugins.permissions;
      const fine = permissions.ACCESS_FINE_LOCATION;
      const has = await new Promise((resolve) => {
        permissions.checkPermission(fine, (status) => resolve(!!status.hasPermission), () => resolve(false));
      });
      return !!has;
    } catch (_) {
      return true;
    }
  }

  // Open device location settings (Android)
  openLocationSettings() {
    try {
      if (window.cordova && window.cordova.plugins && window.cordova.plugins.diagnostic && window.cordova.plugins.diagnostic.switchToLocationSettings) {
        window.cordova.plugins.diagnostic.switchToLocationSettings();
      }
    } catch (_) {
      // ignore
    }
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          console.log('📍 Location:', this.currentPosition);
          resolve(this.currentPosition);
        },
        (error) => {
          console.error('📍 Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }

  /**
   * Attempt to get a location using multiple strategies:
   * 1) High accuracy, short timeout
   * 2) Low accuracy, longer timeout
   * 3) Last known position from background watch
   */
  async getBestEffortLocation() {
    // Ensure cordova is ready when applicable
    try { await this.waitUntilReady(5000); } catch (_) {}
    // Request permissions if plugin available
    try { await this.requestLocationPermission(); } catch (_) {}
    // Ensure location services are enabled
    try { await this.ensureLocationServicesEnabled(); } catch (_) {}

    // Strategy 1: high accuracy fast
    try {
      const loc = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
        );
      });
      this.currentPosition = loc;
      return loc;
    } catch (_) {}

    // Strategy 2: low accuracy, longer timeout
    try {
      const loc = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
        );
      });
      this.currentPosition = loc;
      return loc;
    } catch (_) {}

    // Strategy 3: last known
    if (this.currentPosition) {
      return this.currentPosition;
    }

    // Give up
    throw new Error('Location unavailable');
  }

  watchLocation(callback) {
    if (!navigator.geolocation) return null;

    return navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        callback(this.currentPosition);
      },
      (error) => {
        console.error('📍 Watch location error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000
      }
    );
  }

  // ==================== CAMERA ====================

  async takePicture(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.camera) {
        reject(new Error('Camera not available'));
        return;
      }

      const defaultOptions = {
        quality: 80,
        destinationType: navigator.camera.DestinationType.DATA_URL,
        sourceType: navigator.camera.PictureSourceType.CAMERA,
        encodingType: navigator.camera.EncodingType.JPEG,
        mediaType: navigator.camera.MediaType.PICTURE,
        correctOrientation: true,
        saveToPhotoAlbum: false
      };

      navigator.camera.getPicture(
        (imageData) => {
          const imageUrl = `data:image/jpeg;base64,${imageData}`;
          console.log('📷 Picture taken');
          resolve(imageUrl);
        },
        (error) => {
          console.error('📷 Camera error:', error);
          reject(error);
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  async selectFromGallery(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.camera) {
        reject(new Error('Camera not available'));
        return;
      }

      const defaultOptions = {
        quality: 80,
        destinationType: navigator.camera.DestinationType.DATA_URL,
        sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
        encodingType: navigator.camera.EncodingType.JPEG,
        mediaType: navigator.camera.MediaType.PICTURE
      };

      navigator.camera.getPicture(
        (imageData) => {
          const imageUrl = `data:image/jpeg;base64,${imageData}`;
          console.log('🖼️ Image selected');
          resolve(imageUrl);
        },
        (error) => {
          console.error('🖼️ Gallery error:', error);
          reject(error);
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  // ==================== NETWORK ====================

  setupNetwork() {
    if (navigator.connection) {
      this.updateNetworkStatus();
      
      document.addEventListener('online', () => {
        this.networkStatus = 'online';
        console.log('🌐 Network: Online');
        this.emit('networkStatusChanged', 'online');
      });

      document.addEventListener('offline', () => {
        this.networkStatus = 'offline';
        console.log('🌐 Network: Offline');
        this.emit('networkStatusChanged', 'offline');
      });
    }
  }

  updateNetworkStatus() {
    if (navigator.connection) {
      const connection = navigator.connection;
      this.networkStatus = navigator.onLine ? 'online' : 'offline';
      this.connectionType = connection.type;
      console.log('🌐 Network:', this.networkStatus, this.connectionType);
    }
  }

  isOnline() {
    return navigator.onLine;
  }

  // ==================== BACK BUTTON ====================

  setupBackButton() {
    document.addEventListener('backbutton', (e) => {
      e.preventDefault();
      console.log('⬅️ Back button pressed');
      this.emit('backButton');
    }, false);
  }

  // ==================== DEEP LINKS ====================

  setupDeepLinks() {
    if (window.universalLinks) {
      window.universalLinks.subscribe(null, (eventData) => {
        console.log('🔗 Deep link:', eventData.url);
        this.emit('deepLink', eventData.url);
      });
    }
  }

  // ==================== VIBRATION ====================

  vibrate(duration = 100) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }

  // ==================== LOCAL NOTIFICATIONS ====================

  async scheduleNotification(options) {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
      const notification = window.cordova.plugins.notification.local;
      notification.schedule({
        title: options.title,
        text: options.text,
        foreground: true,
        ...options
      });
    }
  }

  // ==================== APP INFO ====================

  getAppVersion() {
    if (window.cordova) {
      return window.cordova.getAppVersion?.getVersionNumber() || '1.0.0';
    }
    return '1.0.0';
  }

  getBuildNumber() {
    if (window.cordova) {
      return window.cordova.getAppVersion?.getVersionCode() || '1';
    }
    return '1';
  }

  // ==================== EVENT SYSTEM ====================

  eventListeners = new Map();

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const callbacks = this.eventListeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }

  // ==================== UTILITY ====================

  openExternalUrl(url) {
    if (window.cordova && window.cordova.InAppBrowser) {
      window.cordova.InAppBrowser.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  }

  exitApp() {
    if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    }
  }

  getDeviceInfo() {
    return this.device || {
      platform: 'browser',
      version: 'unknown',
      model: 'browser',
      manufacturer: 'browser'
    };
  }
}

// Export singleton
const cordovaIntegration = new CordovaIntegration();
export default cordovaIntegration;

