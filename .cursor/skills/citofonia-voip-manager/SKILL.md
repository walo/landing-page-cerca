---
name: CitofoniaVoIPManager
description: Experto en servicios de voz sobre IP, citofonía nativa y gestión de periféricos de audio externos. Utilízalo para implementar llamadas, configurar audio y conectar hardware especializado.
---

# Habilidad: CitofoniaVoIPManager

Esta habilidad proporciona el conocimiento técnico necesario para implementar sistemas de comunicación en tiempo real (VoIP) integrados profundamente con el sistema operativo y hardware periférico.

## Meta
Asegurar que las comunicaciones de citofonía sean instantáneas, confiables y utilicen las mejores prácticas de integración nativa en plataformas móviles y de escritorio.

## Disparadores Semánticos
- "Implementa la llamada"
- "Configura el audio"
- "Conecta el auricular USB"
- "Recibe la notificación de portería"

## Instrucciones y Reglas Técnicas

### 1. Integración en Android (Kotlin)
- **SERVICIOS**: Implementar un `ForegroundService` para mantener la conexión activa incluso cuando la aplicación está en segundo plano.
- **ESTADOS DE LLAMADA**: Utilizar `ConnectionService` para integrar las llamadas de citofonía con el sistema de llamadas nativo del dispositivo (GSM/LTE), asegurando que se respeten las prioridades del sistema.
- **ESTADO DEL DISPOSITIVO**: Manejar correctamente los cambios de conectividad y estados de batería para optimizar el consumo.

### 2. Integración Mobile Cross-platform (Flutter)
- **NATIVIDAD**: Implementar la lógica de **CallKit** (iOS) y las APIs equivalentes en Android para asegurar que el dispositivo "despierte" con una interfaz de llamada nativa a pantalla completa cuando se recibe una alerta de portería.
- **PUSH NOTIFICATIONS**: Integrar con servicios de notificaciones de alta prioridad (PushKit / FCM High Priority) para minimizar la latencia.

### 3. Gestión de Hardware y Periféricos
- **USB-HID**: Implementar escuchadores de eventos **USB-HID** para detectar acciones en handsets físicos (levantar el auricular, colgar, presionar botones de apertura).
- **ENRUTAMIENTO DE AUDIO**: Automatizar el cambio de entrada/salida de audio al detectar la conexión de periféricos especializados, priorizando el auricular USB sobre los altavoces internos cuando el sistema esté en modo "Portería".

## Restricciones
- No utilizar implementaciones de VoIP básicas (solo WebRTC simple) si se requiere integración con el sistema de llamadas del SO.
- No permitir que el audio se reproduzca por altavoces externos cuando se usa un auricular privado (handset).
- Evitar latencias superiores a 200ms en el establecimiento de la señalización de llamada.
