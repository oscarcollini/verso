'use strict';

globalThis.appLocale = (() => {
  const english = {
    "Cerca": "Search",
    "Finestra di mira": "Viewfinder",
    "Attiva fotocamera": "Enable camera",
    "Spegni fotocamera": "Turn camera off",
    "Fotocamera non disponibile.": "Camera unavailable.",
    "Accesso alla fotocamera negato.": "Camera access denied.",
    "Chiudi": "Close",
    "Installa": "Install",
    "Installa app": "Install app",
    "Risultato": "Result",
    "Riprendi": "Resume",
    "Pausa": "Pause",
    "Copia": "Copy",
    "Riprova": "Try again",
    "In Chrome apri il menu ⋮ e scegli «Aggiungi a schermata Home» o «Installa app», se disponibile.": "Open Chrome’s ⋮ menu and choose “Add to Home screen” or “Install app” if available.",
    "Il browser non ha aperto la richiesta. Riprova dal menu ⋮.": "The browser didn’t open the install prompt. Try again from the ⋮ menu.",
    "In Chrome apri ⋮ e scegli «Aggiungi a schermata Home» o «Installa app».": "In Chrome, open ⋮ and choose “Add to Home screen” or “Install app”.",
    "Bussola e clinometro": "Compass and clinometer",
    "Azimut": "Azimuth",
    "Inclinazione": "Tilt",
    "Attiva sensori": "Enable sensors",
    "Blocca": "Lock",
    "Cerca una direzione": "Find a direction",
    "Azimut °": "Azimuth °",
    "Altezza °": "Elevation °",
    "Punta": "Aim",
    "Posizione su richiesta": "Location on request",
    "Rileva": "Locate",
    "Lettura bloccata": "Reading locked",
    "Azimut non disponibile": "Azimuth unavailable",
    "Mira verticale · azimut indefinito": "Aiming vertically · azimuth undefined",
    "Nord del sensore": "Sensor north",
    "In attesa dell’azimut": "Waiting for azimuth",
    "Distanza dal bersaglio: {0}°": "Angle to target: {0}°",
    "Bersaglio in mira": "Target in sight",
    "In mira": "On target",
    "Apri la pagina HTTPS in un browser con accesso ai sensori.": "Open the HTTPS page in a browser with access to sensors.",
    "Accesso ai sensori negato.": "Sensor access denied.",
    "In attesa dei sensori…": "Waiting for sensors…",
    "Nessuna lettura. Controlla il permesso «Sensori di movimento» nel browser.": "No readings. Check the browser’s “Motion sensors” permission.",
    "Impossibile attivare i sensori.": "Couldn’t enable the sensors.",
    "Misura": "Measure",
    "Attiva i sensori per puntare": "Enable sensors to aim",
    "Posizione non disponibile": "Location unavailable",
    "Ricerca della posizione…": "Getting your location…",
    "Accesso alla posizione negato": "Location access denied",
    "Posizione non disponibile. Riprova.": "Location unavailable. Try again.",
    "Copiato": "Copied",
    "SO": "SW",
    "O": "W",
    "NO": "NW"
  };
  const preference = navigator.language || navigator.languages?.[0] || 'it';
  const language = /^it(?:-|$)/i.test(preference) ? 'it' : 'en';
  const locale = /^(?:it|en)(?:-|$)/i.test(preference) ? preference : 'en';
  const text = (source, ...values) => {
    const message = language === 'en' && Object.hasOwn(english, source) ? english[source] : source;
    return values.length ? message.replace(/\{(\d+)\}/g, (_, index) => values[Number(index)]) : message;
  };

  document.documentElement.lang = language;
  if (language === 'en') {
    document.querySelector('link[rel="manifest"]').href = "manifest-en.webmanifest?v=12";
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement.closest('script, style')) continue;
      const source = node.data.trim();
      if (Object.hasOwn(english, source)) node.data = node.data.replace(source, () => text(source));
    }
    for (const element of document.querySelectorAll('[aria-label], [alt], [placeholder], [title]')) {
      for (const attribute of ['aria-label', 'alt', 'placeholder', 'title']) {
        if (element.hasAttribute(attribute)) element.setAttribute(attribute, text(element.getAttribute(attribute)));
      }
    }
    for (const link of document.querySelectorAll('a[rel~="license"], a[href*="creativecommons.org/licenses/"]')) {
      link.href = link.href.replace(/deed\.it$/, 'deed.en');
    }
  }
  return { text, locale };
})();
