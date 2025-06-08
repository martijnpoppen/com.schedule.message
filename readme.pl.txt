Schedule Message to aplikacja Homey umożliwiająca wysyłanie wiadomości o określonej godzinie. Wiadomości mogą być obsługiwane przez inne aplikacje, takie jak Telegram, WhatsApp, Signal czy Slack. Automatyzuj przypomnienia, powiadomienia lub własne wiadomości.

Funkcje:
- Planowanie wiadomości na datę i godzinę
- Obsługa kategorii i odbiorców
- Współpraca z innymi aplikacjami Homey
- Zaawansowana integracja przez surowe dane

Użycie:
1. Zainstaluj aplikację na Homey.
2. Utwórz flow z akcją "Zaplanować wiadomość".
3. Wprowadź wiadomość, datę, godzinę i opcjonalnie odbiorcę/kategorię.
4. Wiadomość zostanie wysłana o zaplanowanej godzinie.

Zaawansowane:
- Użyj "Zaplanować wiadomość (raw)" w formacie:  
  `data|godzina|odbiorca|wiadomość`  
  Przykład: `04-12-2025|12:00|+48123123123|Witaj świecie`
- Możesz użyć prefiksu do usunięcia danych.