// Weather data transformer function
const transformWeatherData = (data) => ({
  location: {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
  },
  current: data.current_weather
    ? {
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        winddirection: data.current_weather.winddirection,
        weathercode: data.current_weather.weathercode,
        time: data.current_weather.time,
      }
    : null,
  forecast: data.daily
    ? {
        dates: data.daily.time,
        temperatures_max: data.daily.temperature_2m_max,
        temperatures_min: data.daily.temperature_2m_min,
        weather_codes: data.daily.weathercode,
      }
    : null,
});

export default {
  // Weather endpoints
  getWeather: {
    url: 'https://api.open-meteo.com/v1/forecast',
    description: 'Get weather forecast data',
    transformer: transformWeatherData,
    defaultParams: {
      current_weather: true,
      daily: 'temperature_2m_max,temperature_2m_min,weathercode',
    },
  },
  getCurrentWeather: {
    url: 'https://api.open-meteo.com/v1/forecast',
    description: 'Get current weather conditions',
    transformer: (data) => ({
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
      },
      current: data.current_weather
        ? {
            temperature: data.current_weather.temperature,
            windspeed: data.current_weather.windspeed,
            winddirection: data.current_weather.winddirection,
            weathercode: data.current_weather.weathercode,
            time: data.current_weather.time,
          }
        : null,
    }),
    defaultParams: {
      current_weather: true,
    },
  },

  // Test endpoints
  getUsers: {
    url: 'https://jsonplaceholder.typicode.com/users',
    description: 'Get test user data',
    transformer: (data) =>
      data.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        city: user.address.city,
      })),
  },

  getPosts: {
    url: 'https://jsonplaceholder.typicode.com/posts',
    description: 'Get test post data',
  },

  // Add more endpoints as needed
  // Each endpoint can have:
  // - url: the API endpoint URL
  // - description: human-readable description
  // - transformer: optional function to transform the response data
  // - defaultParams: default query parameters
};
