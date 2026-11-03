# Verteilung und Signierung der Firefox-Erweiterung

Dieses Dokument beschreibt die Optionen zur Bereitstellung und Aktualisierung der Erweiterung **SwissQRRechnung** auf Einzelplatz- und Mehrplatz-Installationen (Windows und Linux).

Die Erweiterung besitzt die feste Gecko-Erweiterungs-ID:
```json
"browser_specific_settings": {
  "gecko": {
    "id": "swissqrrechnung@spitex.local",
    "strict_min_version": "142.0"
  }
}
```

---

## 1. Verteilungswege im Überblick

| Methode | Zielgruppe | Vorteile | Nachteile |
|---|---|---|---|
| **A: Signierung AMO (unlisted)** | Einzelplätze oder verteilte Benutzer | Kann ohne Gruppenrichtlinien in jedem regulären Firefox installiert werden; signiert von Mozilla. | Mozilla-Konto mit API-Key erforderlich. |
| **B: Firefox Enterprise Policy (`policies.json`)** | Verwaltete Rechner (Windows/Linux) | Vollautomatische Installation ohne AMO-Signierungspflicht; zentrale Konfiguration. | Administratorrechte auf dem Zielrechner nötig. |
| **C: Temporäres Laden (`about:debugging`)** | Entwickler & Schnelltest | Sofort einsatzbereit ohne Zertifikate. | Bleibt nur bis zum Schliessen des Browsers aktiv. |

---

## 2. Methode A: Signierung über AMO (unlisted / Self-Distribution)

Mozilla erlaubt das kostenlose Signieren eigener Erweiterungen für den Eigenbetrieb, ohne sie im öffentlichen Add-on-Store zu listen.

### Voraussetzungen
1. Ein Account auf [addons.mozilla.org (AMO)](https://addons.mozilla.org/).
2. Unter *Tools > API-Schlüssel* einen API-Key (`JWT Issuer`) und ein API-Secret (`JWT Secret`) erzeugen.

### Signierung per Befehl
Im Ordner `extension`:
```bash
npm run package
npx web-ext sign --api-key="<DEIN_JWT_ISSUER>" --api-secret="<DEIN_JWT_SECRET>" --channel=unlisted
```

Mozilla validiert und signiert die Erweiterung automatisch und lädt die fertige `.xpi`-Datei in den Ordner `web-ext-artifacts/`.

### Installation beim Endanwender
1. Die signierte `.xpi`-Datei an den Benutzer senden oder auf einem internen Netzlaufwerk / Webserver bereitstellen.
2. In Firefox die `.xpi`-Datei per Drag & Drop in das Browserfenster ziehen oder über `about:addons` (Zahnrad > *Add-on aus Datei installieren...*) auswählen.
3. Berechtigungsabfrage bestätigen.

### Auto-Update-Mechanismus für selbstgehostete XPIs
Wenn neue Versionen automatisch bezogen werden sollen:
1. In `manifest.json` die Update-URL eintragen:
   ```json
   "browser_specific_settings": {
     "gecko": {
       "id": "swissqrrechnung@spitex.local",
       "update_url": "https://intranet.ihre-domain.ch/extensions/updates.json"
     }
   }
   ```
2. Auf dem internen Webserver die Datei `updates.json` bereitstellen (Vorlage in `extension/distribution/updates.json`):
   ```json
   {
     "addons": {
       "swissqrrechnung@spitex.local": {
         "updates": [
           {
             "version": "1.0.1",
             "update_link": "https://intranet.ihre-domain.ch/extensions/swissqrrechnung-1.0.1.xpi"
           }
         ]
       }
     }
   }
   ```
3. Firefox prüft diese Datei periodisch und aktualisiert das Add-on automatisch im Hintergrund.

---

## 3. Methode B: Bereitstellung via Firefox Policy (`policies.json`)

Für Umgebungen mit mehreren Rechnern kann Firefox über die Enterprise Policies vorkonfiguriert werden.

### Konfigurationsdatei `distribution/policies.json`
Eine Vorlage befindet sich in `extension/distribution/policies.json`:
```json
{
  "policies": {
    "ExtensionSettings": {
      "swissqrrechnung@spitex.local": {
        "installation_mode": "normal_installed",
        "install_url": "file:///C:/Program%20Files/SwissQRRechnung/swissqrrechnung-1.0.0.xpi"
      }
    }
  }
}
```
*(Hinweis: `install_url` kann auch eine interne HTTPS-URL sein, z. B. `https://intranet.ihre-domain.ch/extensions/swissqrrechnung.xpi`)*.

### Speicherort der `policies.json`:

#### Windows:
- Im Firefox-Installationsverzeichnis im Unterordner `distribution`:
  `C:\Program Files\Mozilla Firefox\distribution\policies.json`

#### Linux:
- Systemweit für alle Firefox-Installationen:
  `/etc/firefox/policies/policies.json`
  oder im Firefox-Programmverzeichnis:
  `/usr/lib/firefox/distribution/policies.json`

Beim nächsten Start von Firefox wird die Erweiterung automatisch installiert und aktiviert.

---

## 4. Methode C: Temporäres Laden zum Testen

Für schnelle Vorabtests auf einem sauberen Firefox-Profil:
1. Firefox öffnen und `about:debugging#/runtime/this-firefox` in die Adresszeile eingeben.
2. Auf **«Temporäres Add-on laden...»** klicken.
3. Zur Datei `extension/manifest.json` navigieren und öffnen.
4. Die Erweiterung ist sofort aktiv (inkl. Optionen unter `about:addons` oder Toolbar-Icon).
