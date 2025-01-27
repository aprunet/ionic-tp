import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class WeatherService {
  private apiKey: string = 'd86340f4165f2b8674f98652be4efc9e';
  private apiUrl: string = 'https://api.openweathermap.org/data/2.5';

  constructor(private http: HttpClient) { }

  getWeather(city: string, units: 'metric' | 'imperial'): Observable<any> {
    const url = `${this.apiUrl}/weather`;
    const params = {
      q: city,
      appid: this.apiKey,
      units,
    };

    return this.http.get(url, { params }).pipe(
      map((response: any) => {
        return {
          name: response.name,
          country: response.sys.country,
          temperature: response.main.temp,
          feels_like: response.main.feels_like,
          temp_min: response.main.temp_min,
          temp_max: response.main.temp_max,
          description: response.weather[0].description,
          icon: response.weather[0].icon,
          wind: {
            speed: response.wind.speed,
            deg: response.wind.deg,
          },
          clouds: response.clouds.all,
          rain: response.rain ? response.rain['1h'] : 0,
          pressure: response.main.pressure,
          humidity: response.main.humidity,
          visibility: response.visibility,
          sunrise: response.sys.sunrise,
          sunset: response.sys.sunset,
          timezone: response.timezone,
        };
      })
    );
  }
}
