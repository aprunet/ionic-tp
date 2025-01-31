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
    // Détection de la plateforme mobile ou desktop
    this.isMobile = this.platform.is('cordova') || this.platform.is('capacitor') || window.matchMedia("(max-width: 768px)").matches;
  }

  async ngOnInit() {
    // Light/dark mode et récupération de l'historique de recherches
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.initializeDarkPalette(prefersDark.matches);
    prefersDark.addEventListener('change', (mediaQuery) => this.initializeDarkPalette(mediaQuery.matches));
    this.searchHistory = await this.historyService.getHistory();
  }

  //Gestion light/dark mode (doc Ionic)
  /** Applique l'affichage du mode sombre selon la préférence utilisateur */
  initializeDarkPalette(isDark: boolean) {
    this.paletteToggle = isDark;
    this.toggleDarkPalette(isDark);
  }
  /** Active/désactive le mode sombre */
  toggleChange() {
    this.paletteToggle = !this.paletteToggle;
    this.toggleDarkPalette(this.paletteToggle);
  }
  /** Applique la classe CSS pour le mode sombre */
  toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }

  /** Formate le pays reçu (FR -> France) */
  processCountry(data: { country: string }) {
    return data.country.replace(/(\w{2})/g, (match: any, countryCode: string) => {
      return ` ${flags[countryCode] || countryCode}`;
    });
  }

  /** Applique le fond météorologique correspondant aux conditions */
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

  /** Effectue la recherche météo d'une ville */
  async getWeather() {
    this.loading = true;
    this.searching = true;

    //Si la barre de recherche a été remplie on appelle la méthode du weatherService pour requêter l'api
    if (this.city.trim()) {
      this.weatherService.getWeather(this.city, this.unit).subscribe({
        next: async (data) => {
          //Réponse positive de l'api on traite la data reçue et on l'affiche à l'utilisateur
          this.searching = false;
          data.country = this.processCountry({ country: data.country });
          this.weatherData = data;
          this.city = data.name;
          this.setWeatherBackground(data);
          this.errorMessage = '';
          await this.historyService.addToHistory(this.city);
          this.searchHistory = await this.historyService.getHistory();
        },
        error: (err) => {
          //Réponse négative affichage de l'erreur
          this.searching = false;
          this.weatherData = null;
          err.message = err.message.includes('404') ? 'La ville spécifiée est introuvable, veuillez réessayer.' : err.message;
          this.errorMessage = err.message || 'Une erreur est survenue';
          console.error('Erreur :', err);
        },
      });
    } else {
      //Sécurité si recherche demandée alors que la barre de recherche est vide
      this.searching = false;
      alert('Veuillez entrer le nom d\'une ville.');
    }

    this.loading = false;
  }

  /** Sélectionne une ville depuis l'historique */
  selectCity(cityName: string) {
    this.city = cityName;
    this.getWeather();
  }

  /** Efface complètement l'historique des recherches */
  async clearHistory() {
    await this.historyService.clearHistory();
    this.searchHistory = [];
  }

  /** Supprime une ville spécifique de l'historique */
  async removeCity(event: MouseEvent, city: string) {
    event.stopPropagation();
    await this.historyService.removeFromHistory(city);
    this.searchHistory = await this.historyService.getHistory();
  }

  /** Bascule entre Celsius et Fahrenheit */
  toggleUnit() {
    this.unit = this.unit === 'metric' ? 'imperial' : 'metric';
    if (this.city.trim()) {
      this.getWeather();
    }
  }

  /** Récupère la localisation GPS (mobile) */
  async getLocation() {
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
        this.handleLocationSuccessAndGetWeather(position.coords.latitude, position.coords.longitude);
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

  /** Récupère la localisation GPS (desktop) */
  getLocationWeb() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      this.searching = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.handleLocationSuccessAndGetWeather(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        this.searching = false;
        this.errorMessage = "Accès à la localisation refusé.";
        console.error("Erreur de géolocalisation navigateur :", error);
      }
    );
  }

  /** Vérifie et demande les permissions de localisation (précise ou approximative) */
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

  //Suggestion IA
  /** Assure une meilleure précision GPS */
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

  /** Effectue la recherche météo d'une ville après obtention de la position */
  handleLocationSuccessAndGetWeather(latitude: number, longitude: number) {
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


  /** Réinitialise l'affichage et retourne à la page d'accueil */
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
