
# Revisión Weather CLI

1 - Colores: no hay ninguno; falta definir cyan (menú), amarillo (temp), verde/rojo (ok/error).
2 - AGENTS.md: dice que index.ts es stub, pero la app ya funciona — hay que actualizarlo.
3 - Ciudades: geocoding solo trae 1 resultado; nombres ambiguos pueden fallar.
4 - Tests: no existen; conviene al menos probar storage y las APIs con mocks.
5 - Binario: compila bien; revisar que ./weather guarde datos en ~/.config/weather-cli/.
6 - Escalabilidad: ¿qué tan fácil será expandir con nuevas funcionalidades?
7 - Carga: ¿hay estado de carga en las tareas asíncronas?
7 - Pronóstico de 7 días: agregar la posibilidad de obtener el pronostico para los proximos 7 dias