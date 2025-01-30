import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../services/weather/weather.service';
import { HistoryService } from '../services/history/history.service';
import { flags } from '../data/countries';
import { weatherConditions } from '../data/weather-conditions';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Platform } from '@ionic/angular';

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
  isMobile: boolean = false;

  constructor(
    private weatherService: WeatherService,
    private historyService: HistoryService,
    private androidPermissions: AndroidPermissions,
    private geolocation: Geolocation,
    private locationAccuracy: LocationAccuracy,
    private platform: Platform
  ) {
    this.isMobile = this.platform.is('cordova') || this.platform.is('capacitor') || window.matchMedia("(max-width: 768px)").matches;
  }

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

  setWeatherBackground(data: any) {
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
      }) : console.warn("backgroundElem not found");
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
          this.city = data.name;
          this.setWeatherBackground(data);
          this.errorMessage = '';

          await this.historyService.addToHistory(this.city);
          this.searchHistory = await this.historyService.getHistory();

          console.log('Données météo :', data);
        },
        error: (err) => {
          this.searching = false;
          this.weatherData = null;
          err.message = err.message.includes('404') ? 'La ville spécifiée est introuvable, veuillez réessayer.' : err.message;
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

  async getLocation(retry = false) {
    this.searching = true;

    try {
      if (this.isMobile) {
        const permissionType = await this.checkPermissions();
        if (permissionType === 'denied') {
          this.searching = false;
          this.errorMessage = "Permission de localisation refusée.";
          return;
        }

        if (permissionType === 'fine') {
          await this.ensureLocationAccuracy();
        }

        let enableHighAccuracy = permissionType === 'fine';
        const position = await this.geolocation.getCurrentPosition({ enableHighAccuracy });

        if (!position || !position.coords) 
          throw new Error("Position introuvable.");

        console.log(`Localisation récupérée : ${position.coords.latitude}, ${position.coords.longitude} (précision : ${position.coords.accuracy}m)`);
        this.handleLocationSuccess(position.coords.latitude, position.coords.longitude);
      } else {
        this.getLocationWeb();
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.searching = false;
      this.errorMessage = "Erreur lors de la récupération de la localisation.";
      console.error("Erreur de géolocalisation :", errMessage);
    }
  }


  getLocationWeb() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      this.searching = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.handleLocationSuccess(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        this.searching = false;
        this.errorMessage = "Accès à la localisation refusé.";
        console.error("Erreur de géolocalisation navigateur :", error);
      }
    );
  }

  async checkPermissions(): Promise<'fine' | 'coarse' | 'denied'> {
    try {
      const fineLocation = await this.androidPermissions.checkPermission(
        this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION
      );

      const coarseLocation = await this.androidPermissions.checkPermission(
        this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION
      );

      if (fineLocation.hasPermission) {
        return 'fine';
      }

      if (coarseLocation.hasPermission) {
        return 'coarse';
      }

      const request = await this.androidPermissions.requestPermissions([
        this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION,
        this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION
      ]);

      if (request.hasPermission) {
        return fineLocation.hasPermission ? 'fine' : 'coarse';
      }

      return 'denied';
    } catch (error) {
      console.warn("Impossible de vérifier les permissions.", error);
      return 'denied';
    }
  }

  async ensureLocationAccuracy(): Promise<void> {
    try {
      const canRequest = await this.locationAccuracy.canRequest();

      if (canRequest) {
        await this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY);
      }
    } catch (error) {
      console.warn("Impossible d'améliorer la précision GPS.", error);
    }
  }

  handleLocationSuccess(latitude: number, longitude: number) {
    console.log(`Localisation récupérée : ${latitude}, ${longitude}`);

    this.weatherService.getWeatherByCoords(latitude, longitude, this.unit).subscribe({
      next: async (data) => {
        if (!data || !data.name) {
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
        this.setWeatherBackground(data);
        this.errorMessage = '';
      },
      error: (err) => {
        this.searching = false;
        this.weatherData = null;
        this.errorMessage = "Impossible d'obtenir la météo.";
        console.error("Erreur météo :", err);
      },
    });
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
