// Configuración de MQTT (Usaremos HiveMQ público que provee WebSockets)
const brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
const topic = 'sciee_project_MATEO_weather_topic_123';

// Variables de estadoUI
const statusDot = document.getElementById('connection-status');
const statusText = document.getElementById('connection-text');

// Opciones de conexión
const options = {
    clean: true,
    connectTimeout: 4000,
    clientId: 'web_client_' + Math.random().toString(16).substr(2, 8),
};

// Extrayendo Elementos del DOM
const elTempDht = document.getElementById('val-tempdht');
const elHum = document.getElementById('val-hum');
const elTempBmp = document.getElementById('val-tempbmp');
const elPres = document.getElementById('val-pres');
const elAlt = document.getElementById('val-alt');
const elWind = document.getElementById('val-wind');
const elRain = document.getElementById('val-rain');
const elRainAnalog = document.getElementById('val-rain-analog');

// Configuración de Gráficos (Chart.js)
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'Inter';

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', labels: { color: '#f8fafc' } }
    },
    scales: {
        x: { 
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { maxTicksLimit: 10 }
        },
        y: { 
            grid: { color: 'rgba(255, 255, 255, 0.05)' } 
        }
    },
    animation: { duration: 400 }
};

// Gráfico de Temperatura
const ctxTemp = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(ctxTemp, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Temp DHT22 (°C)',
                borderColor: '#facc15',
                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.4,
                fill: true,
                data: []
            },
            {
                label: 'Temp BMP280 (°C)',
                borderColor: '#f87171',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.4,
                fill: true,
                data: []
            }
        ]
    },
    options: commonOptions
});

// Gráfico de Humedad y Presión
const ctxHumPres = document.getElementById('humPresChart').getContext('2d');
const humPresChart = new Chart(ctxHumPres, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Humedad (%)',
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                yAxisID: 'y',
                tension: 0.4,
                data: []
            },
            {
                label: 'Presión (hPa)',
                borderColor: '#c084fc',
                backgroundColor: 'rgba(192, 132, 252, 0.1)',
                borderWidth: 2,
                yAxisID: 'y1',
                tension: 0.4,
                data: []
            }
        ]
    },
    options: {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false }
            }
        }
    }
});

// Función para actualizar gráficos
const maxDataPoints = 20;
function updateCharts(timeStr, data) {
    // Si llegamos al máximo, quitar el primer elemento
    if (tempChart.data.labels.length > maxDataPoints) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
        tempChart.data.datasets[1].data.shift();
        
        humPresChart.data.labels.shift();
        humPresChart.data.datasets[0].data.shift();
        humPresChart.data.datasets[1].data.shift();
    }

    // Agregar nuevos datos
    tempChart.data.labels.push(timeStr);
    tempChart.data.datasets[0].data.push(data.tempDHT);
    tempChart.data.datasets[1].data.push(data.tempBMP);
    
    humPresChart.data.labels.push(timeStr);
    humPresChart.data.datasets[0].data.push(data.humidity);
    humPresChart.data.datasets[1].data.push(data.pressure);

    // Renderizar
    tempChart.update();
    humPresChart.update();
}

// Conexión MQTT
console.log('Intentando conectar a ' + brokerUrl);
const client = mqtt.connect(brokerUrl, options);

client.on('connect', function () {
    console.log('Conectado a MQTT vía WebSocket');
    statusDot.className = 'status-dot connected';
    statusText.innerText = 'Conectado y Recibiendo Datos';
    
    // Suscribirse al tópico
    client.subscribe(topic, function (err) {
        if (!err) {
            console.log('Suscrito a ' + topic);
        } else {
            console.error('Error al suscribirse: ', err);
        }
    });
});

client.on('reconnect', function () {
    statusDot.className = 'status-dot disconnected';
    statusText.innerText = 'Reconectando...';
});

client.on('offline', function () {
    statusDot.className = 'status-dot disconnected';
    statusText.innerText = 'Fuera de línea';
});

client.on('error', function (error) {
    console.error('Error de conexión:', error);
    statusDot.className = 'status-dot disconnected';
    statusText.innerText = 'Error de conexión';
});

client.on('message', function (topic, message) {
    try {
        const payload = JSON.parse(message.toString());
        console.log('Nuevo mensaje recibido:', payload);
        
        // Actualizar UI
        elTempDht.innerText = payload.tempDHT !== null ? payload.tempDHT.toFixed(1) : '--';
        elHum.innerText = payload.humidity !== null ? payload.humidity.toFixed(1) : '--';
        elTempBmp.innerText = payload.tempBMP !== null ? payload.tempBMP.toFixed(1) : '--';
        elPres.innerText = payload.pressure !== null ? payload.pressure.toFixed(1) : '--';
        if (payload.altitude !== undefined) {
            elAlt.innerText = payload.altitude !== null ? payload.altitude.toFixed(1) : '--';
        }
        elWind.innerText = payload.windSpeed !== null ? payload.windSpeed.toFixed(1) : '--';
        
        if (payload.rainDigital !== undefined) {
            elRain.innerText = payload.rainDigital === 0 ? 'Sí (Lloviendo/Nieve)' : 'No';
            elRain.style.color = payload.rainDigital === 0 ? '#38bdf8' : 'var(--text-main)';
        }
        
        if (payload.rainAnalog !== undefined) {
            elRainAnalog.innerText = payload.rainAnalog;
        }

        // Hora actual
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                        now.getMinutes().toString().padStart(2, '0') + ':' + 
                        now.getSeconds().toString().padStart(2, '0');
        
        // Actualizar gráficos
        updateCharts(timeStr, payload);

    } catch (e) {
        console.error('Error parseando JSON del MQTT:', e);
    }
});
