import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private _storage: Storage | null = null;
  private readonly HISTORY_KEY = 'search_history';

  constructor(private storage: Storage) {
    this.init();
  }

  /** Initialise le stockage local */
  private async init() {
    this._storage = await this.storage.create();
  }

  /** Ajoute une ville à l'historique (évite les doublons, limite à 10) */
  async addToHistory(city: string): Promise<void> {
    if (!this._storage) return;

    let history = await this._storage.get(this.HISTORY_KEY) || [];
    
    history = history.filter((c: string) => c !== city); //Si la ville existe déjà suppression pour éviter les doublons
    history.unshift(city);
    history = history.slice(0, 10); //Limite de 10 villes max

    await this._storage.set(this.HISTORY_KEY, history);
  }

  /** Récupère l'historique des recherches */
  async getHistory(): Promise<string[]> {
    await this.init();
    return (await this._storage?.get(this.HISTORY_KEY)) || [];
  }

  /** Supprime une ville spécifique de l'historique */
  async removeFromHistory(city: string): Promise<void> {
    if (!this._storage) return;

    let history = await this._storage.get(this.HISTORY_KEY) || [];
    history = history.filter((c: string) => c !== city);

    await this._storage.set(this.HISTORY_KEY, history);
  }

  /** Efface entièrement l'historique des recherches */
  async clearHistory(): Promise<void> {
    if (!this._storage) return;
    await this._storage.remove(this.HISTORY_KEY);
  }
}
