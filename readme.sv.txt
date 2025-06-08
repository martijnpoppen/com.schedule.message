Schedule Message är en Homey-app som låter dig skicka meddelanden vid en viss tidpunkt. Meddelanden kan hanteras av andra appar som Telegram, WhatsApp, Signal eller Slack. Automatisera påminnelser, aviseringar eller egna meddelanden.

Funktioner:
- Schemalägg meddelanden till datum och tid
- Stöd för kategorier och mottagare
- Fungerar med andra Homey-appar
- Avancerad integration via rådata

Användning:
1. Installera appen på Homey.
2. Skapa ett flöde med "Schemalägg meddelande"-kortet.
3. Ange meddelande, datum, tid och ev. mottagare/kategori.
4. Meddelandet skickas vid vald tidpunkt.

Avancerat:
- Använd "Schemalägg meddelande (rå)" med format:  
  `datum|tid|mottagare|meddelande`  
  Exempel: `04-12-2025|12:00|+46701234567|Hej världen`
- Prefix kan tas bort vid behov.