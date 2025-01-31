import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  /** Récupère la position actuelle de l'utilisateur */
  async getCurrentPosition(): Promise<Position> {
    const coordinates = await Geolocation.getCurrentPosition();
    return coordinates;
  }

  /**
   * Surveille la position en temps réel et exécute un callback à chaque mise à jour
   * @param callback Fonction exécutée à chaque mise à jour de la position
   */
  async watchPosition(callback: (position: Position | null) => void) {
    const watch = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      callback
    );
    return watch;
  }

  /** Vérifie et demande les permissions de localisation si nécessaire */
  async requestPermissions() {
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location === 'prompt') {
      await Geolocation.requestPermissions();
    }
  }
}