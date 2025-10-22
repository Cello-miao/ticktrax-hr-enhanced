// Cordova Service for native device features
/**
 * CordovaService 是 移动端特有功能的统一接口
 * 相比 CordovaIntegration，它更轻量，面向 服务调用，适合在 Vue、React 等前端项目中直接注入和使用。
 */
class CordovaService {
  constructor() {
    this.isReady = false;
    this.deviceInfo = null;
    this.callbacks = [];
    
    this.initializeCordova();
  }

  // Initialize Cordova
  initializeCordova() {
    if (window.cordova) {
      document.addEventListener('deviceready', () => {
        this.isReady = true;
        this.deviceInfo = this.getDeviceInfo();
        console.log('Cordova is ready!', this.deviceInfo);
        
        // Execute any pending callbacks
        this.callbacks.forEach(callback => callback());
        this.callbacks = [];
        
        this.setupEventListeners();
      }, false);
    } else {
      // Fallback for web browsers
      console.log('Cordova not available - running in web mode');
      this.isReady = true;
      setTimeout(() => {
        this.callbacks.forEach(callback => callback());
        this.callbacks = [];
      }, 100);
    }
  }

  // Wait for Cordova to be ready
  ready(callback) {
    if (this.isReady) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (!window.cordova) return;

    // Handle app pause/resume
    document.addEventListener('pause', () => {
      console.log('App paused');
      this.onAppPause();
    }, false);

    document.addEventListener('resume', () => {
      console.log('App resumed');
      this.onAppResume();
    }, false);

    // Handle back button on Android
    document.addEventListener('backbutton', (e) => {
      e.preventDefault();
      this.onBackButton();
    }, false);

    // Handle network status
    if (navigator.connection) {
      document.addEventListener('online', () => {
        this.onNetworkStatusChange(true);
      }, false);

      document.addEventListener('offline', () => {
        this.onNetworkStatusChange(false);
      }, false);
    }
  }

  // Get device information
  getDeviceInfo() {
    if (window.device) {
      return {
        platform: window.device.platform,
        version: window.device.version,
        model: window.device.model,
        manufacturer: window.device.manufacturer,
        uuid: window.device.uuid,
        cordova: window.device.cordova,
        isVirtual: window.device.isVirtual
      };
    }
    return null;
  }

  // Status bar management
  setStatusBar(style = 'default', color = '#2563eb') {
    if (window.StatusBar) {
      switch (style) {
        case 'light':
          window.StatusBar.styleLightContent();
          break;
        case 'dark':
          window.StatusBar.styleDefault();
          break;
        default:
          window.StatusBar.styleDefault();
      }
      
      if (color) {
        window.StatusBar.backgroundColorByHexString(color);
      }
      
      window.StatusBar.show();
    }
  }

  // Hide status bar
  hideStatusBar() {
    if (window.StatusBar) {
      window.StatusBar.hide();
    }
  }

  // Show status bar
  showStatusBar() {
    if (window.StatusBar) {
      window.StatusBar.show();
    }
  }

  // Geolocation with enhanced options
  async getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp
            });
          },
          (error) => {
            reject(new Error(`Location error: ${error.message}`));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
            ...options
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  // Watch location changes
  watchLocation(callback, errorCallback, options = {}) {
    if (navigator.geolocation) {
      return navigator.geolocation.watchPosition(
        callback,
        errorCallback,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
          ...options
        }
      );
    }
    return null;
  }

  // Stop watching location
  clearLocationWatch(watchId) {
    if (navigator.geolocation && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Camera functionality
  async takePhoto(options = {}) {
    return new Promise((resolve, reject) => {
      if (navigator.camera) {
        navigator.camera.getPicture(
          (imageURI) => {
            resolve(imageURI);
          },
          (error) => {
            reject(new Error(`Camera error: ${error}`));
          },
          {
            quality: 75,
            destinationType: navigator.camera.DestinationType.FILE_URI,
            sourceType: navigator.camera.PictureSourceType.CAMERA,
            encodingType: navigator.camera.EncodingType.JPEG,
            targetWidth: 1024,
            targetHeight: 1024,
            correctOrientation: true,
            ...options
          }
        );
      } else {
        reject(new Error('Camera not available'));
      }
    });
  }

  // Select photo from gallery
  async selectPhoto(options = {}) {
    return new Promise((resolve, reject) => {
      if (navigator.camera) {
        navigator.camera.getPicture(
          (imageURI) => {
            resolve(imageURI);
          },
          (error) => {
            reject(new Error(`Gallery error: ${error}`));
          },
          {
            quality: 75,
            destinationType: navigator.camera.DestinationType.FILE_URI,
            sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
            encodingType: navigator.camera.EncodingType.JPEG,
            targetWidth: 1024,
            targetHeight: 1024,
            correctOrientation: true,
            ...options
          }
        );
      } else {
        reject(new Error('Camera not available'));
      }
    });
  }

  // Vibration
  vibrate(duration = 200) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    } else if (navigator.notification && navigator.notification.vibrate) {
      navigator.notification.vibrate(duration);
    }
  }

  // Network information
  getNetworkInfo() {
    if (navigator.connection) {
      return {
        type: navigator.connection.type,
        isOnline: navigator.onLine,
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      };
    }
    return {
      isOnline: navigator.onLine
    };
  }

  // App events
  onAppPause() {
    // Handle app pause (save data, pause timers, etc.)
    console.log('App paused - saving state');
    this.saveAppState();
  }

  onAppResume() {
    // Handle app resume (refresh data, resume timers, etc.)
    console.log('App resumed - refreshing data');
    this.refreshAppData();
  }

  onBackButton() {
    // Handle Android back button
    console.log('Back button pressed');
    
    // Custom back button logic
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Ask user if they want to exit
      this.confirmExit();
    }
  }

  onNetworkStatusChange(isOnline) {
    console.log('Network status changed:', isOnline);
    
    // Dispatch custom event
    const event = new CustomEvent('networkchange', {
      detail: { isOnline }
    });
    document.dispatchEvent(event);
  }

  // Save app state when pausing
  saveAppState() {
    const appState = {
      timestamp: Date.now(),
      currentView: window.currentView || 'dashboard',
      userData: JSON.parse(localStorage.getItem('user_data') || '{}')
    };
    localStorage.setItem('app_state', JSON.stringify(appState));
  }

  // Refresh app data when resuming
  refreshAppData() {
    // Trigger data refresh in your app
    const event = new CustomEvent('appresume');
    document.dispatchEvent(event);
  }

  // Confirm app exit
  confirmExit() {
    if (navigator.notification) {
      navigator.notification.confirm(
        'Are you sure you want to exit TickTrax?',
        (buttonIndex) => {
          if (buttonIndex === 1) {
            navigator.app.exitApp();
          }
        },
        'Exit App',
        ['Yes', 'No']
      );
    } else {
      if (confirm('Are you sure you want to exit TickTrax?')) {
        if (navigator.app) {
          navigator.app.exitApp();
        }
      }
    }
  }

  // Show native alert
  showAlert(message, title = 'TickTrax', buttonName = 'OK') {
    return new Promise((resolve) => {
      if (navigator.notification) {
        navigator.notification.alert(
          message,
          () => resolve(),
          title,
          buttonName
        );
      } else {
        alert(message);
        resolve();
      }
    });
  }

  // Show native confirm dialog
  showConfirm(message, title = 'TickTrax', buttonLabels = ['OK', 'Cancel']) {
    return new Promise((resolve) => {
      if (navigator.notification) {
        navigator.notification.confirm(
          message,
          (buttonIndex) => resolve(buttonIndex),
          title,
          buttonLabels
        );
      } else {
        const result = confirm(message);
        resolve(result ? 1 : 2);
      }
    });
  }

  // Share content (if available)
  async share(options) {
    if (window.plugins && window.plugins.socialsharing) {
      return new Promise((resolve, reject) => {
        window.plugins.socialsharing.share(
          options.message,
          options.subject,
          options.files,
          options.url,
          () => resolve(true),
          (error) => reject(error)
        );
      });
    } else if (navigator.share) {
      try {
        await navigator.share(options);
        return true;
      } catch (error) {
        throw error;
      }
    } else {
      throw new Error('Sharing not supported');
    }
  }
}

// Create singleton instance
const cordovaService = new CordovaService();

export default cordovaService;
