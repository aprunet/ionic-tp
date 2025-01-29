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

  async init() {
    this._storage = await this.storage.create();
  }

  async addToHistory(city: string): Promise<void> {
    if (!this._storage) return;

    let history = await this._storage.get(this.HISTORY_KEY) || [];
    
    history = history.filter((c: string) => c !== city);
    history.unshift(city);
    history = history.slice(0, 10);

    await this._storage.set(this.HISTORY_KEY, history);
  }

  async getHistory(): Promise<string[]> {
    await this.init();
    return (await this._storage?.get(this.HISTORY_KEY)) || [];
  }

  async removeFromHistory(city: string): Promise<void> {
    if (!this._storage) return;

    let history = await this._storage.get(this.HISTORY_KEY) || [];
    history = history.filter((c: string) => c !== city);

    await this._storage.set(this.HISTORY_KEY, history);
  }

  async clearHistory(): Promise<void> {
    if (!this._storage) return;
    await this._storage.remove(this.HISTORY_KEY);
  }
}
