# SwissQRRechnung

SwissQRRechnung ist eine Firefox-Erweiterung, die Schweizer QR-Rechnungen (Zahlteile nach dem offiziellen SIX Swiss QR Bill Standard) direkt aus dem **VeruA-Intranet** (`https://*.verua.org`) erstellt.

- **Keine Konsolenbedienung**: Stamm- und Rechnungsdaten werden per Mausklick über die bestehende Browser-Sitzung geladen.
- **Keine Datenübertragung an Dritte**: Die QR-Codes und das Rechnungs-PDF werden zu 100 % lokal im Browser erzeugt.
- **Läuft unter Windows, Linux und macOS** mit Mozilla Firefox.

---

## 1. Voraussetzungen

- Mozilla Firefox ab Version 142.0.
- Zugriff auf das VeruA-Intranet (`https://*.verua.org`).

---

## 2. Installation

### Option A: Installation der signierten Erweiterung (`.xpi`)
1. Die bereitgestellte Datei `swissqrrechnung-x.y.z.xpi` herunterladen.
2. Firefox öffnen und `about:addons` in die Adressleiste eingeben (oder Menü *Extras > Add-ons und Themes*).
3. Auf das Zahnrad-Symbol oben rechts klicken und **«Add-on aus Datei installieren...»** auswählen.
4. Die `.xpi`-Datei auswählen und die Installation mit **«Hinzufügen»** bestätigen.

*Alternativ kann die `.xpi`-Datei direkt per Drag & Drop in ein beliebiges Firefox-Fenster gezogen werden.*

### Option B: Zentralverteilung für Unternehmen
Die Erweiterung kann unter Linux (`/etc/firefox/policies/policies.json`) sowie Windows über Firefox Enterprise Policies ohne manuelle Benutzerinteraktion vorkonfiguriert und installiert werden. Details, Signierung und Auto-Update siehe [`docs/VERTEILUNG.md`](docs/VERTEILUNG.md). Vorlagen liegen in [`distribution/`](distribution/).

### Option C: Installation aus den Quelldateien (Entwicklung & Test)
1. Repository klonen und in das Projektverzeichnis wechseln:
   ```bash
   npm install
   npm run build
   ```
2. In Firefox `about:debugging#/runtime/this-firefox` aufrufen.
3. Auf **«Temporäres Add-on laden...»** klicken und die Datei `manifest.json` im Projektverzeichnis auswählen.

---

## 3. Erstmalige Einrichtung (Rechnungssteller)

1. Auf das Erweiterungssymbol in der Firefox-Symbolleiste klicken oder in `about:addons` bei SwissQRRechnung auf **Einstellungen** gehen.
2. Die Rechnungssteller-Angaben hinterlegen:
   - **IBAN**: Schweizer IBAN des Rechnungsstellers (wird mit Modulo-97-Prüfziffer validiert).
   - **Name & Vorname**
   - **Adresse**: Strasse, Hausnummer, PLZ, Ort.
3. *Optional*: Eine bestehende `Rechnungssteller.json` über die Schaltfläche **«Rechnungssteller.json importieren»** einlesen. Die Datei lässt sich über **«Als Rechnungssteller.json exportieren»** auch wieder sichern.
4. Auf **«Einstellungen speichern»** klicken.

---

## 4. Bedienung im Intranet (VeruA)

1. In Firefox bei VeruA anmelden (`https://<kunde>.verua.org`).
2. Im Tab **Rechnungsverwaltung** (`start_abrechnung.php`) erscheint in der Navigationsleiste (neben *Offene Rechnungen*) die rote Schaltfläche **«QR-Rechnungen»**. Auf anderen Seiten wird sie nicht angezeigt.
3. Auf den Button klicken:
   - Es öffnet sich ein Dialog zur Auswahl der Rechnungsperiode (Jahr und Monat von / bis).
   - Die Periode ist standardmässig auf den Vormonat voreingestellt.
4. Auf **«QR-Rechnungen generieren»** klicken:
   - Die Erweiterung lädt die Stammdaten und Rechnungsdaten direkt aus der aktiven Sitzung.
   - Die Daten werden geprüft und zusammengeführt.
   - Das Sammel-PDF aller QR-Rechnungen wird lokal erstellt.
5. In der Ergebnisansicht stehen zur Verfügung:
   - **PDF-Vorschau** direkt im Browser
   - **PDF-Download** und **Direktdruck**
   - **ZIP-Download** mit Einzel-PDFs pro Klient
   - **CSV-Download** (`QR-Rechnungen.csv`) zur Nachkontrolle

---

## 5. Datenschutz und Sicherheit

- **100 % lokale Verarbeitung**: Weder Klientennamen, Adressen noch Rechnungsbeträge verlassen den Browser. Es werden keine Daten an externe Server oder Drittanbieter übertragen.
- **Keine Speicherung von Zugangsdaten**: Die Erweiterung nutzt die vorhandene Cookie-Sitzung des angemeldeten Benutzers und speichert keine Passwörter.
- **Keine Telemetrie / Tracking**: Die Erweiterung enthält keinerlei Analyse- oder Tracking-Code.

---

## 6. Referenz: Datenstruktur und Mapping (`QR-Rechnungen.csv`)

Die Zieldatei `QR-Rechnungen.csv` wird im **ANSI-Format** (Windows-1252 / `cp1252`) aus den Stammdaten, Rechnungsdaten und der Rechnungssteller-Konfiguration generiert.

### Mapping

| Zielspalte (QR-Rechnungen.csv) | Quelle | Quellfeld / Logik |
| :--- | :--- | :--- |
| **Lang** | Festwert | `de` |
| **IBAN** | Rechnungssteller | `IBAN` |
| **Cdtr_AdrTp** | Festwert | `S` (Structured Address) |
| **Cdtr_Name** | Rechnungssteller | `Vorname` + `Nachname` |
| **Cdtr_StrtNmOrAdrLine1** | Rechnungssteller | `Strasse` |
| **Cdtr_BldgNbOrAdrLine2** | Rechnungssteller | `StrassenNr` |
| **Cdtr_PstCd** | Rechnungssteller | `PLZ` |
| **Cdtr_TwnNm** | Rechnungssteller | `Ort` |
| **Cdtr_Ctry** | Festwert | `CH` |
| **Amt** | Rechnungsdaten (CSV) | `Klient` bzw. `Klient KLV` (auf zwei Nachkommastellen formatiert) |
| **Ccy** | Festwert | `CHF` |
| **UltmtDbtr_AdrTp** | Festwert | `S` |
| **UltmtDbtr_Name** | Stammdaten (XLS) | `Vorname` + `Nachname` (Match via Name aus CSV) |
| **UltmtDbtr_StrtNmOrAdrLine1** | Stammdaten (XLS) | `Strasse Nr.` (Strasse ohne Hausnummer) |
| **UltmtDbtr_BldgNbOrAdrLine2** | Stammdaten (XLS) | `Strasse Nr.` (nur Hausnummer) |
| **UltmtDbtr_PstCd** | Stammdaten (XLS) | `PLZ` |
| **UltmtDbtr_TwnNm** | Stammdaten (XLS) | `Ort` |
| **UltmtDbtr_Ctry** | Festwert | `CH` |
| **RefTp** | Festwert | `NON` |
| **Ref** | - | *leer* |
| **Ustrd** | Festwert | `Klientenanteil Spitex` |
| **StrdBkgInf** | - | *leer* |
| **AltPmt1** | - | *leer* |
| **AltPmt2** | - | *leer* |
| **FileName** | Logik | PDF-Dateiname (z. B. `Name_Vorname.pdf`) |
| **Anrede** | Stammdaten (XLS) | `Anrede` |
| **Nummer** | Stammdaten (XLS) | `Klienten-Nr.` |

**Logik:**
- Die Klienten werden zwischen den Rechnungsdaten (CSV) und den Stammdaten (XLS) über den Namen (z. B. "Meier, Frau Sandra") zusammengeführt.
- Der Betrag wird aus der Rechnungs-Exportspalte übernommen.
- Summenzeilen in den Rechnungsdaten (bei denen der Name mit "Gesamt" beginnt) und Leerzeilen werden ignoriert.

---

## 7. Entwicklung & Tests

```bash
# Abhängigkeiten installieren
npm install

# Tests ausführen (Vitest)
npm test

# Linter ausführen (web-ext lint)
npm run lint

# Erweiterung kompilieren (dist/)
npm run build

# Fertiges ZIP-Paket für Verteilung erzeugen (web-ext-artifacts/)
npm run package
```

Projektstruktur (Auszug):
- `src/`: Quellcode (`core/` ohne Browser-APIs, `intranet/`, `content/`, `background/`, `pdf/`)
- `options/`: Optionsseite für die Rechnungssteller-Daten
- `test/`: Vitest-Tests; `test/fixtures/` enthält fiktive Beispieldaten
- `icons/`, `manifest.json`: Erweiterungs-Icons und Manifest
- `distribution/`: Vorlagen für Firefox Enterprise Policies und Auto-Update (nicht im Erweiterungspaket)

Weiterführende Dokumentation:
- [`docs/SESSION-WISSEN.md`](docs/SESSION-WISSEN.md): Technische Spezifikationen, Datenmapping und Schnittstellen
- [`docs/ETAPPEN.md`](docs/ETAPPEN.md): Projektfortschritt und Meilensteine
- [`docs/VERTEILUNG.md`](docs/VERTEILUNG.md): Signierung, AMO und Enterprise Deployment
- [`CHANGELOG.md`](CHANGELOG.md): Versionshistorie
