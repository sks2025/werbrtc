import { locationAPI } from './api';

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.isTracking = false;
  }

  // Get current position once
  async getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          };
          
          this.currentPosition = locationData;
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Location access denied';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timeout';
              break;
            default:
              errorMessage = 'Unknown location error';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        finalOptions
      );
    });
  }

  // Save location to backend
  async saveLocationToRoom(roomId, role, locationData = null) {
    try {
      // Get current location if not provided
      const location = locationData || await this.getCurrentPosition();
      
      const payload = {
        roomId,
        role, // 'doctor' or 'patient'
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      };

      // Try to get address using reverse geocoding
      try {
        payload.address = await this.getAddressFromCoords(location.latitude, location.longitude);
      } catch (geocodeError) {
        console.log('Geocoding failed:', geocodeError.message);
        payload.address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      }

      const response = await locationAPI.saveLocation(payload);
      
      if (response.data.success) {
        console.log(`✅ ${role} location saved successfully:`, response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to save location');
      }
    } catch (error) {
      console.error('❌ Error saving location:', error);
      throw error;
    }
  }

  // Get room location data
  async getRoomLocationData(roomId) {
    try {
      const response = await locationAPI.getRoomLocation(roomId);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get location data');
      }
    } catch (error) {
      console.error('❌ Error getting room location:', error);
      throw error;
    }
  }

  // Start watching position (continuous tracking)
  startWatching(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.isTracking = true;
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        };
        
        this.currentPosition = locationData;
        
        if (callback && typeof callback === 'function') {
          callback(locationData);
        }
      },
      (error) => {
        console.error('Location watch error:', error);
        this.isTracking = false;
        
        if (callback && typeof callback === 'function') {
          callback(null, error);
        }
      },
      finalOptions
    );

    return this.watchId;
  }

  // Stop watching position
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
      console.log('📍 Location tracking stopped');
    }
  }

  // Get address from coordinates (simple implementation)
  async getAddressFromCoords(latitude, longitude) {
    try {
      // Simple formatting - in production, use Google Maps Geocoding API
      const lat = parseFloat(latitude).toFixed(6);
      const lng = parseFloat(longitude).toFixed(6);
      return `Lat: ${lat}, Lng: ${lng}`;
    } catch (error) {
      throw new Error('Geocoding failed');
    }
  }

  // Request permission for location access
  async requestLocationPermission() {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        return true;
      } else if (permission.state === 'prompt') {
        // Try to get location to trigger permission prompt
        try {
          await this.getCurrentPosition();
          return true;
        } catch (error) {
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      try {
        await this.getCurrentPosition();
        return true;
      } catch (locationError) {
        return false;
      }
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  // Check if geolocation is supported
  isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  // Get tracking status
  getTrackingStatus() {
    return {
      isSupported: this.isGeolocationSupported(),
      isTracking: this.isTracking,
      currentPosition: this.currentPosition,
      watchId: this.watchId
    };
  }

  // Update location status in backend
  async updateLocationStatus(roomId, status) {
    try {
      const response = await locationAPI.updateStatus({ roomId, status });
      
      if (response.data.success) {
        console.log(`✅ Location status updated to ${status}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('❌ Error updating location status:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const locationService = new LocationService();
export default locationService;
