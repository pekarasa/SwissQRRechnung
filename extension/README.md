# SwissQRRechnung – Firefox-Erweiterung

Die Firefox-Erweiterung **SwissQRRechnung** erstellt Schweizer QR-Rechnungen (Zahlteile nach offiziellem SIX Swiss QR Bill Standard) direkt im Browser aus dem Intranet (**VeruA**).

Sie ersetzt die frühere Python-Version vollständig:
- **Keine Konsolenbedienung**, keine manuelle Dateisuche und keine Python-/Playwright-Installation mehr nötig.
- **Keine Datenübertragung an Drittanbieter**: Rechnungen werden zu 100 % lokal im Browser erzeugt (qr-rechnung.net entfällt).
- **Direkter Abruf**: Stamm- und Rechnungsdaten werden per Knopfdruck über die bestehende Session geladen.

---

## 1. Voraussetzungen

- Mozilla Firefox (ab Version 142.0) unter Windows, Linux oder macOS.
- Zugriff auf das VeruA-Intranet (`https://*.verua.org`).

---

## 2. Installation

### Option A: Installation der signierten Erweiterung (`.xpi`)
1. Die bereitgestellte Datei `swissqrrechnung-x.y.z.xpi` herunterladen.
2. Firefox öffnen.
3. Die `.xpi`-Datei per Drag & Drop in das geöffnete Firefox-Fenster ziehen (oder `about:addons` aufrufen, auf das Zahnrad-Symbol klicken und *«Add-on aus Datei installieren...»* wählen).
4. Die Berechtigungsanfrage mit **«Hinzufügen»** bestätigen.

### Option B: Zentralverteilung für Unternehmen (Windows & Linux)
Für die automatische Verteilung über Unternehmensrichtlinien siehe [`docs/VERTEILUNG.md`](docs/VERTEILUNG.md).

### Option C: Installation aus den Quelldateien (Entwicklung & Test)
1. Repository klonen und in den Ordner wechseln:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. In Firefox `about:debugging#/runtime/this-firefox` aufrufen.
3. Auf **«Temporäres Add-on laden...»** klicken und `manifest.json` im Ordner `extension/` auswählen.

---

## 3. Erstmalige Einrichtung (Rechnungssteller)

1. Nach der Installation auf das Erweiterungssymbol (QR-Icon) in der Firefox-Symbolleiste klicken oder in `about:addons` bei SwissQRRechnung auf **Einstellungen** gehen.
2. Die Rechnungssteller-Angaben hinterlegen:
   - **IBAN**: Gültige Schweizer IBAN des Rechnungsstellers (wird automatisch mit Prüfziffer validiert).
   - **Name & Vorname**
   - **Adresse**: Strasse, Hausnummer, PLZ, Ort.
3. *Optional*: Bestehende `Rechnungssteller.json` aus der Python-Version direkt über die Schaltfläche **«Konfiguration importieren»** einlesen.
4. Auf **«Einstellungen speichern»** klicken.

---

## 4. Bedienung im Intranet (VeruA)

1. Im Firefox auf der gewohnten VeruA-Oberfläche anmelden (`https://<kunde>.verua.org`).
2. Im Abrechnungsbereich erscheint in der Navigationsleiste (neben *Offene Rechnungen*) die rote Schaltfläche **«QR-Rechnungen erstellen»** (zusätzlich steht unten rechts ein Floating-Button bereit).
3. Auf den Button klicken:
   - Es öffnet sich ein Dialog zur Auswahl der Rechnungsperiode (Jahr und Monat von / bis).
   - Die Periode ist standardmässig auf den Vormonat voreingestellt.
4. Auf **«QR-Rechnungen generieren»** klicken:
   - Die Erweiterung lädt die Stammdaten und Rechnungsdaten direkt aus Ihrer aktiven Sitzung.
   - Die Daten werden geprüft und zusammengeführt.
   - Das Sammel-PDF aller QR-Rechnungen wird lokal erstellt.
5. In der Ergebnisansicht können Sie:
   - Die Rechnungen direkt in der **PDF-Vorschau** einsehen.
   - Die Sammel-PDF **herunterladen** oder direkt **ausdrucken**.
   - Einzel-PDFs pro Klient gesammelt als **ZIP-Archiv** herunterladen.
   - Zur Kontrolle die tabellarische **CSV-Datei** herunterladen.

---

## 5. Datenschutz und Sicherheit

- **100 % lokale Verarbeitung**: Weder Klientennamen, Adressen noch Rechnungsbeträge verlassen den Browser. Es werden keinerlei Daten an externe Server oder Drittanbieter übertragen.
- **Keine Speicherung von Zugangsdaten**: Die Erweiterung nutzt die vorhandene Cookie-Sitzung des angemeldeten Benutzers und speichert keine Passwörter.
- **Keine Telemetrie / Tracking**: Die Erweiterung enthält keinerlei Analyse- oder Tracking-Code.

---

## 6. Entwicklung & Tests

```bash
# Abhängigkeiten installieren
npm install

# Tests ausführen (Vitest)
npm test

# Linter ausführen (web-ext lint)
npm run lint

# Erweiterung kompilieren (dist/)
npm run build

# Fertiges ZIP-Paket für Verteilung erzeugen
npm run package
```

Weiterführende Dokumentation:
- [`docs/SESSION-WISSEN.md`](docs/SESSION-WISSEN.md): Technische Spezifikationen, Datenmapping und Schnittstellen
- [`docs/ETAPPEN.md`](docs/ETAPPEN.md): Projektfortschritt und Meilensteine
- [`docs/VERTEILUNG.md`](docs/VERTEILUNG.md): Signierung, AMO und Enterprise Deployment
- [`CHANGELOG.md`](CHANGELOG.md): Versionshistorie
