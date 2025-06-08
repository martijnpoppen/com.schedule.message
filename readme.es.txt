Schedule Message es una app de Homey que te permite enviar mensajes en un momento específico. Otros apps como Telegram, WhatsApp, Signal o Slack pueden procesar estos mensajes. Automatiza recordatorios, notificaciones o mensajes personalizados.

Características:
- Programa mensajes para fecha y hora
- Soporta categorías y destinatarios
- Compatible con otras apps de Homey
- Integración avanzada con entrada raw

Uso:
1. Instala la app en Homey.
2. Crea un flujo con la tarjeta "Programar mensaje".
3. Ingresa mensaje, fecha, hora y opcionalmente destinatario/categoría.
4. El mensaje se enviará en el momento programado.

Avanzado:
- Usa "Programar mensaje (raw)" con formato:  
  `fecha|hora|destinatario|mensaje`  
  Ejemplo: `04-12-2025|12:00|+34612345678|Hola mundo`
- Puedes usar un prefijo para eliminar datos si es necesario.