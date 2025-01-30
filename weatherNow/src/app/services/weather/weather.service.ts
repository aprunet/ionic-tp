import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class WeatherService {
  private apiKey: string = 'd86340f4165f2b8674f98652be4efc9e';
  private apiUrl: string = 'https://api.openweathermap.org/data/2.5';

  private thunderstormTimerId: number | null = null;

  constructor(private http: HttpClient) { }

  getWeatherByCoords(lat: number, lon: number, unit: 'metric' | 'imperial') {
    const url = `${this.apiUrl}/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${this.apiKey}`;
    return this.http.get<any>(url).pipe(
      map((data) => this.formatWeatherData(data))
    );
  }

  private formatWeatherData(data: any) {
    return {
      name: data.name,
      country: data.sys.country,
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility,
      wind: {
        speed: data.wind.speed,
        deg: data.wind.deg,
      },
      rain: data.rain ? (data.rain['1h'] || 0) : 0,
      clouds: data.clouds.all,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      icon: data.weather[0].icon,
      description: data.weather[0].description,
    };
  }
  

  getWeather(city: string, units: 'metric' | 'imperial'): Observable<any> {
    const url = `${this.apiUrl}/weather`;
    const params = {
      q: city,
      appid: this.apiKey,
      units,
    };

    return this.http.get(url, { params }).pipe(
      map((response: any) => {
        return this.formatWeatherData(response);
      })
    );
  }

  createRainEffect(): void {
    console.warn("creating rain effect");
    const rainEffect = document.querySelector('.rain-effect');
    if (!rainEffect) {
      console.warn(`Container '${rainEffect}' not found.`);
      return;
    }

    const numberOfDrops = 100;
    for (let i = 0; i < numberOfDrops; i++) {
      const drop = document.createElement('div');
      drop.classList.add('raindrop');

      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDelay = `${Math.random()}s`;
      drop.style.animationDuration = `${0.5 + Math.random()}s`;


      rainEffect.appendChild(drop);
      console.warn("drop added ?");
    }
  }

  stopRainEffect(): void {
    const rainEffect = document.querySelector('.rain-effect');
    if (!rainEffect) {
      console.warn(`Container '${rainEffect}' not found.`);
      return;
    }

    while (rainEffect.firstChild) {
      rainEffect.removeChild(rainEffect.firstChild);
    }
  }

  enableThunderstormEffect(): void {
    const thunderstormElem = document.querySelector('.thunderstorm');
  
    const randomFlash = () => {
      if (thunderstormElem) {
        thunderstormElem.classList.add('flash-active');
  
        setTimeout(() => {
          thunderstormElem.classList.remove('flash-active');
        }, 200);
  
        this.thunderstormTimerId = window.setTimeout(randomFlash, Math.random() * 8000 + 5000);
      }
    };
  
    if (!thunderstormElem) {
      console.error('Thunderstorm element not found');
      return;
    } else {
      randomFlash();
    }
  }
  

  disableThunderstormEffect(): void {
    if (this.thunderstormTimerId !== null) {
      clearTimeout(this.thunderstormTimerId);
      this.thunderstormTimerId = null;
    }

    const thunderstormElem = document.querySelector('.thunderstorm');
    if (thunderstormElem) {
      thunderstormElem.classList.remove('flash-active');
    }
  }
}
