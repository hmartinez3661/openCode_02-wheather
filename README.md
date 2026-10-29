
# Weather CLI APP

El objetivo de esta aplicación es que creemos una aplicación de consola que pida que ingresemos la ciudad, Al final, generaremos un binario ejecutable.

# Opciones:
Ingresar el nombre de una ciudad.
Guardar la ciudad por defecto.
Registrar varias otras ciudades para buscar el clima en esas otras ciudades.
Consultar el pronóstico de los próximos 7 días de cualquier ciudad registrada.

# Stack
Bun.js
OpenMeteo

# Ejemplo de petición http:
Paso 1: Geocoding API.
Paso 2: OpenMeteo API.

https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=7&timezone=auto

# Inicializar proyecto
bun init

# Ejemplo del menú
Esta es la apariencia que deseamos crear

════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. Clima de ciudad default
  2. Clima de todas las ciudades (1)
  3. Buscar y agregar ciudad
  4. Eliminar ciudad
  5. Establecer ciudad default
  6. Pronóstico de 7 días
  8. Ajustes (°C)
  9. Salir
════════════════════════════════════════
  Selecciona una opción: 5

# Uso

```bash
bun install
bun run start
```

La primera vez la aplicación pedirá una ciudad y la guardará como default. El estado se
divide en dos archivos junto al ejecutable compilado (en desarrollo quedan en la raíz del
proyecto):

- `cities.json`: ciudades guardadas y ciudad default.
- `settings.json`: preferencias, como la unidad de temperatura.

Si existe un `weather-cli.json` anterior, se migra automáticamente a los dos archivos
nuevos la primera vez y se conserva como respaldo. Variables de entorno disponibles:

- `WEATHER_CLI_DATA_DIR`: cambia el directorio donde viven `cities.json` y `settings.json`.
- `WEATHER_CLI_STATE_PATH`: ubicación del `weather-cli.json` anterior; su directorio se usa
  como base si no se define `WEATHER_CLI_DATA_DIR`.

# Scripts

| Comando | Descripción |
| --- | --- |
| `bun run start` | Ejecuta la CLI. |
| `bun test` | Ejecuta las pruebas unitarias. |
| `bun run typecheck` | Verifica los tipos con `bun check`. |
| `bun run build` | Genera el binario en `dist/weather` (`dist/weather.exe` en Windows). |

# Colores

La salida usa:

- **Cyan**: menú, bordes y prompts.
- **Amarillo**: temperaturas y sensación térmica.
- **Verde**: operaciones correctas.
- **Rojo**: errores.

Los colores se desactivan automáticamente cuando la salida no es una terminal. También se
pueden controlar con variables de entorno:

- `NO_COLOR=1`: desactiva los colores.
- `FORCE_COLOR=1`: los fuerza, útil para probar con pipes.