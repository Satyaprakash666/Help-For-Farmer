let API_KEY;

// LINK HERE
// fetch('/get-api-key')
fetch(`${rootUrl}/get-api-key`)
  .then(response => response.json())
  .then(data => {
    API_KEY = data.apiKey;
})
.catch(error => console.error('Error fetching API key:', error));


const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const errorContainer = document.getElementById('errorContainer');
const loader = document.getElementById('loader');
const currentWeather = document.getElementById('currentWeather');
const forecast = document.getElementById('forecast');
const todayForecast = document.getElementById('todayForecast')
const detailedSection = document.getElementById('detailedForecast');
const container = document.querySelector('.detailed-forecast-container');
const detailContainer = document.querySelector('.detailed-forecast-container');



searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

// Add location button click handler
locationBtn.addEventListener('click', () => {
    showLoader();
    hideError();
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                getWeatherByCoordinates(lat, lon);
            },
            (error) => {
                console.error('Error getting location:', error);
                showError();
                hideLoader();
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
        hideLoader();
    }
});

async function getWeatherData(city) {
    showLoader();
    hideError();

    setTimeout(async() => {
        console.log("Hello after 2 seconds");
    

    try {
        const formattedCity = encodeURIComponent(city.trim());
        
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?q=${formattedCity}&appid=${API_KEY}&units=metric`
        );
        
        if (!weatherResponse.ok) {
            throw new Error('City not found');
        }

        const weatherData = await weatherResponse.json();

        const airQualityResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${API_KEY}`
        );
        const airQualityData = await airQualityResponse.json();

        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${formattedCity}&appid=${API_KEY}&units=metric`
        );
        const forecastData = await forecastResponse.json();

        updateUI(weatherData, forecastData, airQualityData);
        updateBackground(weatherData.weather[0].main);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError();
    } finally {
        hideLoader();
    }


    }, 4000);
}

async function getWeatherByCoordinates(lat, lon) {
    try {
        // First get the city name using reverse geocoding
        const geocodeResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        
        if (!geocodeResponse.ok) {
            throw new Error('Location data not found');
        }

        const locationData = await geocodeResponse.json();
        const cityName = locationData[0]?.name || 'Unknown Location';

        // Now get weather data
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!weatherResponse.ok) {
            throw new Error('Weather data not found');
        }

        const weatherData = await weatherResponse.json();
        // Update the city name in weather data with the correct one from geocoding
        weatherData.name = cityName;

        const airQualityResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const airQualityData = await airQualityResponse.json();

        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        const forecastData = await forecastResponse.json();

        updateUI(weatherData, forecastData, airQualityData);
        updateBackground(weatherData.weather[0].main);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError();
    } finally {
        hideLoader();
    }
}

function updateUI(weatherData, forecastData, airQualityData) {
    document.getElementById('cityName').textContent = weatherData.name;
    const today = new Date();
    document.getElementById('currentDate').innerHTML = `
        ${today.toLocaleDateString('en-GB')}
        <br>
        <span class="day-text">${today.toLocaleDateString('en-US', { weekday: 'long' })}</span>
    `;
    document.getElementById('temperature').textContent = Math.round(weatherData.main.temp);
    document.getElementById('feelsLike').textContent = Math.round(weatherData.main.feels_like);
    document.getElementById('weatherDescription').textContent = 
        weatherData.weather[0].description.charAt(0).toUpperCase() + 
        weatherData.weather[0].description.slice(1);
    document.getElementById('humidity').textContent = weatherData.main.humidity;
    document.getElementById('windSpeed').textContent = weatherData.wind.speed;
    document.getElementById('weatherIcon').src = 
        `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;

    const userTimezoneOffset = new Date().getTimezoneOffset() * 60;
    const cityTimezoneOffset = weatherData.timezone;
    
    const sunriseTime = new Date((weatherData.sys.sunrise + cityTimezoneOffset + userTimezoneOffset) * 1000);
    const sunsetTime = new Date((weatherData.sys.sunset + cityTimezoneOffset + userTimezoneOffset) * 1000);
    
    document.getElementById('sunrise').textContent = sunriseTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    document.getElementById('sunset').textContent = sunsetTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    updateAirQuality(airQualityData);
    updateTodayForecast(forecastData);
    updateFiveDayForecast(forecastData);
    
    detailContainer.innerHTML = '';
    document.getElementById('detailedForecast').style.display = 'none';
}

function updateTodayForecast(forecastData) {
    const container = document.querySelector('.hourly-forecast-container');
    container.innerHTML = '';

    if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
        container.innerHTML = '<p>No forecast data available</p>';
        return;
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const todayForecasts = forecastData.list.filter(forecast => {
        const forecastTime = new Date(forecast.dt * 1000);
        return forecastTime >= now && forecastTime < tomorrow;
    });

    if (todayForecasts.length === 0) {
        container.innerHTML = '<p>No forecast data available for today</p>';
        return;
    }

    todayForecasts.forEach(forecast => {
        const forecastTime = new Date(forecast.dt * 1000);
        const time = forecastTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const card = document.createElement('div');
        card.className = 'hourly-forecast-card';
        card.innerHTML = `
            <div class="time">${time}</div>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="Weather icon">
            <div class="temp">${Math.round(forecast.main.temp)}°C</div>
            <div class="feels-like">Feels like: ${Math.round(forecast.main.feels_like)}°C</div>
            <div class="description">${forecast.weather[0].description}</div>
            <div class="humidity">Humidity: ${forecast.main.humidity}%</div>
        `;
        container.appendChild(card);
    });
}

function updateFiveDayForecast(forecastData) {
    const container = document.querySelector('.forecast-container');
    container.innerHTML = '';

    const dailyForecasts = forecastData.list.filter(forecast => 
        forecast.dt_txt.includes('12:00:00')
    ).slice(0, 5);

    dailyForecasts.forEach(day => {
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <h3>${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</h3>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="Weather icon">
            <p class="temperature">${Math.round(day.main.temp)}°C</p>
            <p>${day.weather[0].description}</p>
        `;

        forecastCard.addEventListener('click', () => {
            showDetailedForecast(day.dt, forecastData);
        });

        container.appendChild(forecastCard);
    });
}

async function showDetailedForecast(timestamp, forecastData) {
    const selectedDate = new Date(timestamp * 1000).setHours(0, 0, 0, 0);
    
    detailContainer.innerHTML = '';
    detailedSection.style.display = 'block';

    const dateHeader = document.createElement('h3');
    const headerDate = new Date(timestamp * 1000);
    dateHeader.textContent = headerDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    dateHeader.className = 'detailed-forecast-date';
    detailContainer.appendChild(dateHeader);

    const dayForecasts = forecastData.list.filter(forecast => {
        const forecastDate = new Date(forecast.dt * 1000).setHours(0, 0, 0, 0);
        return forecastDate === selectedDate;
    });

    dayForecasts.forEach(forecast => {
        const forecastTime = new Date(forecast.dt * 1000);
        const time = forecastTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const card = document.createElement('div');
        card.className = 'detailed-forecast-card';
        card.innerHTML = `
            <div class="time">${time}</div>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="Weather icon">
            <div class="temp">${Math.round(forecast.main.temp)}°C</div>
            <div class="feels-like">Feels like: ${Math.round(forecast.main.feels_like)}°C</div>
            <div class="description">${forecast.weather[0].description}</div>
            <div class="humidity">Humidity: ${forecast.main.humidity}%</div>
            <div class="wind">Wind: ${forecast.wind.speed} m/s</div>
        `;
        detailContainer.appendChild(card);
    });

    detailedSection.scrollIntoView({ behavior: 'smooth' });
}

function updateBackground(weatherType) {
    document.body.className = '';
    switch (weatherType.toLowerCase()) {
        case 'clouds':
            document.body.classList.add('cloudy');
            break;
        case 'clear':
            document.body.classList.add('clear');
            break;
        case 'rain':
        case 'drizzle':
        case 'thunderstorm':
            document.body.classList.add('rain');
            break;
    }
}

function showLoader() {
    loader.style.display = 'flex';
    currentWeather.style.display = 'none';
    forecast.style.display = 'none';
    todayForecast.style.display = 'none';
    detailedSection.style.display = 'none'
}

function hideLoader() {
    loader.style.display = 'none';
    currentWeather.style.display = 'block';
    forecast.style.display = 'block';
    todayForecast.style.display = 'block';
    detailedSection.style.display = 'block'
}

function showError() {
    errorContainer.style.display = 'block';
    currentWeather.style.display = 'none';
    forecast.style.display = 'none';
    todayForecast.style.display = 'none';
    detailedSection.style.display = 'none'
}

function hideError() {
    errorContainer.style.display = 'none';
}

function getAirQualityText(aqi) {
    switch (aqi) {
        case 1:
            return 'Good';
        case 2:
            return 'Moderate';
        case 3:
            return 'Poor';
        case 4:
            return 'Very Poor';
        case 5:
            return 'Severe';
        default:
            return 'Unknown';
    }
}

function getAirQualityClass(aqi) {
    switch (aqi) {
        case 1:
            return 'good';
        case 2:
            return 'moderate';
        case 3:
            return 'poor';
        case 4:
            return 'very-poor';
        case 5:
            return 'severe';
        default:
            return '';
    }
}

function updateAirQuality(airQualityData) {
    const airQualityElement = document.getElementById('airQuality');
    if (airQualityData && airQualityData.list && airQualityData.list[0]) {
        const aqi = airQualityData.list[0].main.aqi;
        const airQualityText = getAirQualityText(aqi);
        
        airQualityElement.textContent = airQualityText;
        airQualityElement.className = '';
        airQualityElement.classList.add(getAirQualityClass(aqi));
    } else {
        airQualityElement.textContent = 'Not available';
    }
} 