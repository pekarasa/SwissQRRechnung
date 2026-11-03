# SwissQRRechnung

SwissQRRechnung erstellt Schweizer QR-Rechnungen (nach dem offiziellen SIX Swiss QR Bill Standard) direkt aus dem **VeruA-Intranet** (`https://*.verua.org`).

Die Lösung existiert in zwei Varianten:
1. **Firefox-Erweiterung (`extension/`)** – **Empfohlene Lösung**: Läuft direkt im Browser (Windows, Linux, macOS), lädt Stamm- und Rechnungsdaten per Mausklick über die aktive VeruA-Session und erzeugt das PDF zu 100 % lokal ohne Konsolenbedienung oder externe Cloud-Dienste.
2. **Python-Konsolenanwendung (`app.py`)** – **Ursprünglicher Prototyp / Referenz**: Überwacht Verzeichnisse und automatisiert den Upload zu `qr-rechnung.net` per Playwright.

---

## Firefox-Erweiterung (Empfohlen)

### 1. Installation

#### Unter Linux & Windows (Standard-Installation)
1. Die Erweiterungsdatei `swissqrrechnung-x.y.z.xpi` herunterladen.
2. Firefox öffnen und `about:addons` in die Adressleiste eingeben (oder Menü *Extras > Add-ons und Themes*).
3. Auf das Zahnrad-Symbol oben rechts klicken und **«Add-on aus Datei installieren...»** auswählen.
4. Die heruntergeladene `.xpi`-Datei auswählen und die Installation mit **«Hinzufügen»** bestätigen.
*(Alternativ kann die `.xpi`-Datei direkt per Drag & Drop in ein beliebiges Firefox-Fenster gezogen werden).*

#### Für Administratoren / Mehrplatz-Installationen (Enterprise Policy)
Die Erweiterung kann unter Linux (`/etc/firefox/policies/policies.json`) sowie Windows zentral über Firefox Enterprise Policies ohne manuelle Benutzerinteraktion vorkonfiguriert und installiert werden. Siehe Details in [`extension/docs/VERTEILUNG.md`](extension/docs/VERTEILUNG.md).

#### Aus dem Quellcode (Entwicklung)
```bash
cd extension
npm install
npm run build
```
In Firefox `about:debugging#/runtime/this-firefox` öffnen, auf **«Temporäres Add-on laden...»** klicken und `extension/manifest.json` auswählen.

---

### 2. Erstmalige Konfiguration

1. In Firefox auf das SwissQRRechnung-Symbol in der Symbolleiste klicken (oder in `about:addons` auf *Einstellungen*).
2. Die Rechnungssteller-Daten erfassen:
   - **IBAN**: Schweizer IBAN (wird mit Modulo-97-Prüfziffer geprüft)
   - **Name & Vorname**
   - **Adresse**: Strasse, Hausnummer, PLZ, Ort
   - *Tipp:* Bestehende `config/Rechnungssteller.json` kann direkt per Mausklick importiert werden.
3. Auf **«Einstellungen speichern»** klicken.

---

### 3. Bedienung

1. Bei VeruA anmelden (`https://<kunde>.verua.org`).
2. Im Menü bei der Rechnungsverwaltung erscheint die rote Schaltfläche **«QR-Rechnungen erstellen»** (sowie ein Floating-Button am unteren rechten Bildschirmrand).
3. Rechnungsperiode wählen (ist automatisch auf den Vormonat vordefiniert) und auf **«QR-Rechnungen generieren»** klicken.
4. Die Rechnungen werden sofort generiert. In der Dialog-Ansicht stehen zur Verfügung:
   - **PDF-Vorschau** direkt im Browser
   - **PDF-Download** & **Direktdruck**
   - **ZIP-Download** mit Einzel-PDFs pro Klient
   - **CSV-Download** (`QR-Rechnungen.csv`) zur Nachkontrolle

---

### 4. Datenschutz & Sicherheit

- **Keine Datenübertragung nach aussen**: Alle Personen-, Adress- und Rechnungsdaten verbleiben vollständig im Browser des Nutzers. Die Erzeugung der QR-Codes und des Rechnungs-PDFs erfolgt zu 100 % clientseitig.
- **Keine Speicherung von Passwörtern**: Die Erweiterung authentifiziert sich über die bestehende Session im Browser.
- **Keine Telemetrie**: Es werden keinerlei Telemetrie- oder Nutzungsdaten erfasst.

---

## Referenz: Datenstruktur und Mapping (`QR-Rechnungen.csv`)

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

## Ursprüngliche Python-Version (Archiv / Referenz)

Die Python-Dateien im Repository-Root (`app.py`, `test_app.py`) dienen als Referenz zur Verifikation der Datenkompatibilität.

### Installation & Ausführung unter Linux
```bash
sudo apt install python3-venv
python3 -m venv .venv
source .venv/bin/activate
pip install pandas watchdog playwright odfpy xlrd requests
playwright install chromium
```
Konfiguration in `config/Rechnungssteller.json` anpassen und mit `python app.py` starten.
