import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../services/weather.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  loading: boolean = false;
  searching: boolean = false;
  paletteToggle = false;
  city: string = '';
  weatherData: any = null;
  unit: 'metric' | 'imperial' = 'metric';
  errorMessage: string = '';

  constructor(private weatherService: WeatherService) {}

  ngOnInit() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.initializeDarkPalette(prefersDark.matches);
    prefersDark.addEventListener('change', (mediaQuery) => this.initializeDarkPalette(mediaQuery.matches));
  }

  initializeDarkPalette(isDark: boolean) {
    this.paletteToggle = isDark;
    this.toggleDarkPalette(isDark);
  }

  toggleChange() {
    this.paletteToggle = !this.paletteToggle;
    this.toggleDarkPalette(this.paletteToggle);
  }

  toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }

  searchWeather() {
    this.loading, this.searching = true;
    if (this.city.trim()) {
      this.weatherService.getWeather(this.city, this.unit).subscribe({
        next: (data) => {
          this.searching = false;
          this.weatherData = data;
          this.errorMessage = '';
          console.log('Données météo :', data);
        },
        error: (err) => {
          this.searching = false;
          this.weatherData = null;
          this.errorMessage = err.message || 'Une erreur est survenue';
          console.error('Erreur :', err);
        },
      });
    } else {
      alert('Veuillez entrer le nom d\'une ville.');
    }
    this.loading = false;
  }

  toggleUnit() {
    this.unit = this.unit === 'metric' ? 'imperial' : 'metric';
    if (this.city.trim()) {
      this.searchWeather();
    }
  }

  goBackToHomePage() {
    this.city = '';
    this.weatherData = null;
    this.errorMessage = '';
  }
}
