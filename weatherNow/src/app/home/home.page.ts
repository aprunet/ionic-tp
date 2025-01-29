import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../services/weather/weather.service';
import { HistoryService } from '../services/history/history.service';
import { flags } from '../data/countries';
import { weatherConditions } from '../data/weather-conditions';

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
  currentCondition: string = "";
  searchHistory: string[] = [];

  constructor(
    private weatherService: WeatherService,
    private historyService: HistoryService
  ) { }

  async ngOnInit() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.initializeDarkPalette(prefersDark.matches);
    prefersDark.addEventListener('change', (mediaQuery) => this.initializeDarkPalette(mediaQuery.matches));
    this.searchHistory = await this.historyService.getHistory();
  }

  processCountry(data: { country: string }) {
    return data.country.replace(/(\w{2})/g, (match: any, countryCode: string) => {
      return ` ${flags[countryCode] || countryCode}`;
    });
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

  async searchWeather() {
    this.loading = true;
    this.searching = true;

    if (this.city.trim()) {
      this.weatherService.getWeather(this.city, this.unit).subscribe({
        next: async (data) => {
          this.searching = false;
          data.country = this.processCountry({ country: data.country });
          this.weatherData = data;
          const backgroundElem = document.getElementById('weatherBg');
          backgroundElem
            ? weatherConditions[data.icon]?.split(' ').forEach(className => {
              backgroundElem.classList.add(className);
              if (className.includes('rain') || className.includes('thunderstorm')) {
                this.weatherService.createRainEffect();
                if (className.includes('thunderstorm')) {
                  this.weatherService.enableThunderstormEffect();
                }
              }
            }) : console.warn("backgroundElem not found lol");
          this.errorMessage = '';

          await this.historyService.addToHistory(this.city);
          this.searchHistory = await this.historyService.getHistory();

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
      this.searching = false;
      alert('Veuillez entrer le nom d\'une ville.');
    }

    this.loading = false;
  }

  selectCity(cityName: string) {
    this.city = cityName;
    this.searchWeather();
  }


  async clearHistory() {
    await this.historyService.clearHistory();
    this.searchHistory = [];
  }

  async removeCity(event: MouseEvent, city: string) {
    event.stopPropagation();
    await this.historyService.removeFromHistory(city);
    this.searchHistory = await this.historyService.getHistory();
  }

  toggleUnit() {
    this.unit = this.unit === 'metric' ? 'imperial' : 'metric';
    if (this.city.trim()) {
      this.searchWeather();
    }
  }

  getLocation() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      return;
    }
  
    this.searching = true;
  
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Localisation récupérée : ${latitude}, ${longitude}`);
  
        this.weatherService.getWeatherByCoords(latitude, longitude, this.unit).subscribe({
          next: async (data) => {
            if (!data || !data.name) {
              console.error("❌ Aucune donnée météo retournée.");
              this.errorMessage = "Impossible de récupérer la météo.";
              this.searching = false;
              return;
            }
  
            this.searching = false;
            data.country = this.processCountry({ country: data.country });
            this.weatherData = data;
            this.city = data.name;
  
            await this.historyService.addToHistory(this.city);
            this.searchHistory = await this.historyService.getHistory();
  
            const backgroundElem = document.getElementById('weatherBg');
            backgroundElem
              ? weatherConditions[data.icon]?.split(' ').forEach(className => {
                  backgroundElem.classList.add(className);
                  if (className.includes('rain') || className.includes('thunderstorm')) {
                    this.weatherService.createRainEffect();
                    if (className.includes('thunderstorm')) {
                      this.weatherService.enableThunderstormEffect();
                    }
                  }
                })
              : console.warn("backgroundElem not found lol");
  
            this.errorMessage = '';
          },
          error: (err) => {
            this.searching = false;
            this.weatherData = null;
            this.errorMessage = "Impossible d'obtenir la météo.";
            console.error("❌ Erreur météo :", err);
          },
        });
      },
      (error) => {
        this.searching = false;
        this.errorMessage = "Accès à la localisation refusé.";
        console.error("❌ Erreur de géolocalisation :", error);
      }
    );
  }
  

  goBackToHomePage() {
    this.city = '';
    this.weatherData = null;
    this.errorMessage = '';
    this.weatherService.stopRainEffect();
    this.weatherService.disableThunderstormEffect();
    const backgroundElem = document.getElementById('weatherBg');
    backgroundElem ? backgroundElem.classList.remove(
      'clear-sky', 'few-clouds', 'scattered-clouds', 'broken-clouds',
      'rain', 'shower-rain', 'thunderstorm', 'snow', 'mist', 'night'
    ) : null;
  }
}
