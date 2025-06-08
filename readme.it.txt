Schedule Message è un'app Homey che consente di inviare messaggi a un orario specifico. Questi messaggi possono essere gestiti da altre app come Telegram, WhatsApp, Signal o Slack. Automatizza promemoria, notifiche o messaggi personalizzati.

Funzionalità:
- Pianifica messaggi per data e ora
- Supporta categorie e destinatari
- Compatibile con altre app Homey
- Integrazione avanzata tramite input raw

Utilizzo:
1. Installa l’app su Homey.
2. Crea un flow con la scheda "Pianifica messaggio".
3. Inserisci messaggio, data, ora e opzionalmente destinatario/categoria.
4. Il messaggio verrà inviato all’orario programmato.

Avanzato:
- Usa "Pianifica messaggio (raw)" con formato:  
  `data|ora|destinatario|messaggio`  
  Esempio: `04-12-2025|12:00|+393331234567|Ciao mondo`
- Puoi anche usare un prefisso da rimuovere.