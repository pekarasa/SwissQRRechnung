# Zweck

Es soll ein Programm entwickelt werden, das einen Ordner auf bestimmte Dateien überwacht. Sobald die Stamm- und Rechnungsdaten gefunden wurden, werden sie in einer neuen Datei zusammengestellt und an eine Website geschickt, um daraus ein PDF zu erstellen. Nach einem Durchlauf beendet sich das Programm und gibt aus, ob eine PDF erstellt werden konnte, ob Stamm- oder Rechnungsdaten nicht gefunden wurden oder ob ein anderer Fehler aufgetreten ist.
Das Programm läuft unter Linux.

## Programminstallation

1. Entpacke die ausgelieferte zip-Datei nach ~/Applications/SwissQRRechnung
2. Installiere phyten und die notwendigen Abhängigkeiten:
    ```bash
    sudo apt install python3.14-venv
    python3 -m venv .venv
    pip install pandas watchdog playwright odfpy xlrd requests
    playwright install chromium
    ```

## Programmkonfiguration

Konfiguriere das Programm, indem du `nano ./config/Rechnungssteller.json` ausführst und die korrekten Daten eingibst.

## Programmstart

Das Programm kann mit `python app.py` im Verzeicnis `~/Applications/SwissQRRechnung` gestartet werden. 

## Stammdaten

Die Stammdaten sind in einer Excel-Datei gespeichert, deren Namensmuster folgend ist: 'checkDataClients_Klientenstatus_-aktiv_{dd}-{MM}-{yyyy}.xls'
Beispiel: data\checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls

## Rechnungsdaten

Die Rechnungsdaten sind in einer CSV-Datei gespeichert, deren Namensmuster folgend ist: 'Alle_Kantone_{MM}-{MM}_{YYYY}_{##########}.csv'
Beispiel: data\Alle_Kantone_07-07_2026_1785683522.csv

## Konfigurationen

Neben dem zu erstellenden Programm befinden sich die Konfigurationsdateien „Rechnungssteller.json” und „SwissQRRechnung.json”. In der „Rechnungssteller.json” werden die Empfängerdaten für die Ausgabedatei konfiguriert. Mithilfe von „SwissQRRechnung.json” können die zu überwachenden Verzeichnisse sowie die Dateimuster konfiguriert werden.

Beispiel: data\Rechnungssteller.json und data\SwissQRRechnung.json

## Verarbeitung

Wenn sich eine der oben erwähnten Dateien verändert, oder eine neuere Datei im Ornder erscheint, werden alle Daten erneut eingelesen und verarbeitet.
Aus den Stammdaten, der Konfigurationsdatei und den Rechnungsdaten wird eine neue Datei mit dem Namen 'QR-Rechnungen.csv' erstellt.
Diese Datei wird mithilfe einer Browser-Automatisierung (Playwright) auf die Website `https://qr-rechnung.net/#/table` hochgeladen. Dort wird daraus automatisch eine PDF-Datei (`QR-Rechnungen_generiert.pdf`) generiert, heruntergeladen und gespeichert, welche anschließend ausgedruckt werden kann.

## QR-Rechnungen.csv

Die Zieldatei `data\QR-Rechnungen.csv` wird aus den konfigurierten Stammdaten, Rechnungsdaten und der Rechnungssteller-Konfiguration im **ANSI-Format** (Windows-1252 / `cp1252`) generiert.

### Mapping

Das Mapping erfolgt wie folgt:

| Zielspalte (QR-Rechnungen.csv) | Quelle | Quellfeld / Logik |
| :--- | :--- | :--- |
| **Lang** | Festwert | `de` |
| **IBAN** | Rechnungssteller.json | `IBAN` |
| **Cdtr_AdrTp** | Festwert | `S` (Structured Address) |
| **Cdtr_Name** | Rechnungssteller.json | `Vorname` + `Nachname` |
| **Cdtr_StrtNmOrAdrLine1** | Rechnungssteller.json | `Strasse` |
| **Cdtr_BldgNbOrAdrLine2** | Rechnungssteller.json | `StrassenNr` |
| **Cdtr_PstCd** | Rechnungssteller.json | `PLZ` |
| **Cdtr_TwnNm** | Rechnungssteller.json | `Ort` |
| **Cdtr_Ctry** | Festwert | `CH` |
| **Amt** | Rechnungsdaten (CSV) | `Klient` (auf zwei Nachkommastellen formatiert) |
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
| **FileName** | Logik | PDF-Dateiname (z.B. `Name_Vorname.pdf`) |
| **Anrede** | Stammdaten (XLS) | `Anrede` |
| **Nummer** | Stammdaten (XLS) | `Klienten-Nr.` |

**Logik:**

- Die Klienten werden zwischen der CSV (Rechnungsdaten) und der XLS (Stammdaten) über den Namen (z.B. "Meier, Frau Sandra") zugeordnet.
- Der Betrag wird aus der Spalte `Klient` der CSV-Datei für die jeweilige Person übernommen.
- Die Empfängerdaten stammen vollständig aus der `Rechnungssteller.json`.
- Die Adressdaten der Klienten (`UltmtDbtr`) werden aus der Spalte `Strasse Nr.` der Excel-Datei (Stammdaten) extrahiert, wobei die Hausnummer vom Strassennamen getrennt wird.
- Summenzeilen in den Rechnungsdaten (bei denen der Name mit "Gesamt" beginnt) werden beim Einlesen ignoriert.

