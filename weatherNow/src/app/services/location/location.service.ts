import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  async getCurrentPosition(): Promise<Position> {
    const coordinates = await Geolocation.getCurrentPosition();
    return coordinates;
  }

  async watchPosition(callback: (position: Position | null) => void) {
    const watch = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      callback
    );
    return watch;
  }

  async requestPermissions() {
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location === 'prompt') {
      await Geolocation.requestPermissions();
    }
  }
}