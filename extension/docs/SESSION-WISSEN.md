# Session-Wissen: Neuentwicklung SwissQRRechnung als Firefox-Erweiterung

Stand: 2026-11-01. Dieses Dokument hält das gesamte Wissen aus der Planungssession fest,
damit die Arbeit jederzeit ohne Kontextverlust fortgesetzt werden kann.
Der Arbeitsplan steht in `ETAPPEN.md`.

## 1. Ausgangslage

Bestehendes Programm (Python, Konsole, Linux) im Repo-Root: `app.py`, `test_app.py`, `Readme.md`,
`config\*.json`, `data\*`. Es überwacht einen Ordner (watchdog) auf zwei heruntergeladene Dateien,
führt sie zu `QR-Rechnungen.csv` (cp1252) zusammen, lädt diese per Playwright auf
`https://qr-rechnung.net/#/table` hoch und speichert die generierte PDF.

Probleme für Benutzer: manuelle Downloads, Python/venv/Playwright/Chromium-Installation,
Konsolenbedienung.

Ziel: möglichst einfache Bedienung -> **Ansatz B: Firefox-Erweiterung** (Entscheid des Benutzers).
Die PDF darf lokal erzeugt werden (kein qr-rechnung.net nötig). Keine Vorgabe für die Sprache
(gewählt: TypeScript).

## 2. Entscheide

| Thema | Entscheid |
|---|---|
| Ansatz | Firefox-Erweiterung (WebExtension), neuer Ordner `extension\` im Repo |
| Sprache | TypeScript |
| PDF | lokal erzeugen (`pdf-lib` + `swissqrbill`), qr-rechnung.net entfällt |
| Datenabruf | per `fetch` aus dem Content-Script auf `benutzerId.verua.org` (Session-Cookies des eingeloggten Benutzers) |
| Zwischenformat | `QR-Rechnungen.csv` (cp1252) bleibt als optionaler Download/Kontrolle erhalten |
| Verteilung | signierte XPI (AMO «unlisted») oder Firefox-Policy |
| Python-Version | bleibt unverändert im Repo-Root, dient als Referenz für Vergleichstests |

Verworfene Alternativen (Vergleich): A Python+GUI, C lokale Web-App, D reine Browser-Seite (ohne Fetch),
E Desktop-App (Tauri/Electron/.NET). D bleibt als möglicher Fallback; der Core ist so gebaut,
dass er ohne Browser-APIs wiederverwendbar ist.

## 3. Quellsystem (Intranet)

- Startseiten: z. B. `https://benutzerId.verua.org/start.php?first=1&id_owner=1` oder `https://benutzerId.verua.org/start_abrechnung.php` (VeruA Version 9.18).
  Der Hostname variiert je nach Kunde (`https://*.verua.org`).
- Menüstruktur (Rechnungsverwaltung):
  Unterpunkte: `Rechnungen erstellen`, `Daten exportieren`, `Rechnungsbeträge`, `Offene Rechnungen`, gefolgt vom Abmelde-Bereich.
  Zwischen «Offene Rechnungen» und «ABMELDEN» bietet sich Platz für den Erweiterungs-Button «QR-Rechnungen erstellen».
- Seite ist `charset=iso-8859-1`! Antworten **nie** mit `response.text()` lesen (UTF-8-Annahme),
  sondern `arrayBuffer()` + `TextDecoder('windows-1252')` (bzw. erkannte Kodierung).
- Axios ist auf der Seite vorhanden (`/data/js/libs/axios.min.js`), wird aber nicht benötigt.
- Die Links rufen `oeffne(status, url, fname)` auf. Diese Funktion macht nur
  `open(url, fname, "width=1000,height=680,...")`, also ein normaler **GET** in einem Popup.
  Die Erweiterung kann die URLs direkt per `fetch` laden.

Die beiden Export-Links (relativ zu `https://benutzerId.verua.org/`):

1. Klientendaten: «Vollständige Klientendaten nach Excel exportieren»
   `listClientsExportEkarus.php?aktiv=1`
2. Rechnungsdaten: «Daten nach Excel // OpenOffice exportieren»
   `betraege_gesamt_detail_ZR_Export.php?owner=1&sprache=DE&kuerzel_kanton=O_K&id_kanton=0&v_jahr=2026&v_monat=09&b_monat=10`
   - `v_jahr`, `v_monat` (von), `b_monat` (bis) bestimmen die Periode -> Periodenauswahl nötig.
   - Beispieldatei `Alle_Kantone_07-07_2026_<10 Ziffern>.csv` = Periode Juli bis Juli 2026.

Hinweis: In den mitgeteilten Links stehen am Ende der URLs `%27` (z. B. `...b_monat=10%27`).
Das ist sehr wahrscheinlich ein Kopierartefakt (maskierte Hochkommas des JS-Aufrufs). **Nicht** mitsenden.
Zu prüfen (offener Punkt).

## 4. Offene Punkte / Risiken (vor oder in Etappe 2 klären)

1. **Dateiformat Klientenexport.** Der Python-Code nutzt `checkDataClients_Klientenstatus_-aktiv_*.xls`
   (UI-Pfad: «Weitere Aufgaben» -> «Liste + Auswertungen» -> «Klientendaten für elektronische
   Rechnungsübermittlung prüfen»). Der neue Link `listClientsExportEkarus.php?aktiv=1` heisst anders.
   Es muss geprüft werden, ob er **dieselben Spalten** liefert (v. a. `Klienten-Nr.`, `Anrede`,
   `Vorname`, `Nachname`, `Strasse Nr.`, `PLZ`, `Ort`). Sonst Mapping anpassen.
2. **Echte Antwort-Header** der Exporte (Status, Content-Type, Content-Disposition) im Netzwerk-Tab
   prüfen. Eine `.xls` kann in Wahrheit HTML-Tabelle, SpreadsheetML oder echtes BIFF sein.
   SheetJS liest alle drei.
3. **Kodierung der CSV** (UTF-8 oder cp1252/latin1): automatisch erkennen (BOM / UTF-8-Validierung
   mit Fallback cp1252). Umlaute in den Beispieldaten: Köhlerweg, Knüsel.
4. **Periode:** Vorbelegung (Vormonat) oder Werte aus Formular der Seite lesen. Parameter
   `kuerzel_kanton`, `id_kanton`, `owner` ggf. fest oder konfigurierbar.
5. **Mehrere Kantone:** `id_kanton=0` = «Alle Kantone». Beispiel ist `O_K`. Klären, ob konfigurierbar sein soll.
6. **PDF-Layout** muss dem bisherigen Ergebnis entsprechen (siehe Abschnitt 7).
7. **Firefox-Details:** Manifest V3 vs. V2, Signierung (AMO), CSP der Zielseite (Content-Script-fetch
   gleicher Herkunft ist unproblematisch).

## 5. Eingabedaten (Struktur, aus den Beispieldateien in `data\`)

### 5.1 Stammdaten `data\checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls`

- Datei hat eine fehlerhafte Workbook-Struktur (pandas braucht `ignore_workbook_corruption`).
  Der JS-Parser muss tolerant sein.
- Spalten: `Klienten-Nr.`, `Anrede`, `Vorname`, `Nachname`, `Strasse Nr.`, `PLZ`, `Ort`,
  `AHV-Nummer`, `Geburtsdatum`, `VeKa-Nummer`, `Ablaufdatum`, `Wohnkanton`, `Abrechnungskanton`,
  `Kanton ID`, `Kostenträger Gemeinde`, `ID Gemeinde`, `Verordnender Arzt`, `Versicherung`,
  `Versicherungs-Nr.`, `XML-Export`, `Grund Ausschluss XML-Export`, `Ausschluss am`.
- Enthält auch Nicht-Klienten (z. B. `AA_Administration`, `AA_Auslagen` ohne Anrede/Vorname/Adresse).
  Diese dürfen keine Fehler auslösen (kein Rechnungs-Match).
- `PLZ` kommt als Zahl/Float (`4450.0`) -> als Ganzzahl-String formatieren.
- Beispiel-Zeile: `181, Frau, Sandra, Meier, "Hauptstrasse 43", 4450, Sissach`.
- Strasse: `Himmelrain 34a` -> Strasse `Himmelrain`, Nr. `34a`.

### 5.2 Rechnungsdaten `data\Alle_Kantone_07-07_2026_1785683522.csv`

- Tabulator-getrennt, Felder teils in `"..."`, Dezimalpunkt, Tausender mit Hochkomma (`1'332.00`).
- Zeilen 1-4: Titel/Kopf (Python: `skiprows=4`, ohne Header).
- Spalte 0 = Name im Format `Nachname, Anrede Vorname` (z. B. `Meier, Frau Sandra`).
- **Spalte 8 = Betrag «Klient KLV»** (Quelle für `Amt`). Die Python-Version liest nur Index 0 und 8.
- Leere Zeile `" "` und Summenzeile `Gesamtbeträge im Monat` (Name beginnt mit `Gesamt`) werden ignoriert.
- Betragsparser: Hochkomma-Tausendertrenner entfernen, `float`.
- Beispiel-Beträge: Meier 48.00, Steiner 13.40, Knüsel 30.60, Wagner 45.90.

### 5.3 Konfiguration (Python-Repo)

`config\Rechnungssteller.json` Schlüssel: `IBAN`, `Vorname`, `Nachname`, `Strasse`, `StrassenNr`, `PLZ`, `Ort`.
`config\SwissQRRechnung.json`: Verzeichnisse und Regex-Dateimuster (`Stammdaten`, `Rechnungsdaten`,
`QR-Rechnungen`). In der Erweiterung: Optionsseite (`storage.local`) statt JSON; Dateimuster entfallen,
dafür URLs/Periode.

## 6. Mapping und Logik (Referenz: `Readme.md`, `app.py`)

Match der Klienten: Name aus CSV `Nachname, Anrede Vorname` == aus Stammdaten gebildet
`{Nachname}, {Anrede} {Vorname}` (NaN -> leer, trim). Inner Join.

- Keine Treffer -> Fehler «Keine übereinstimmenden Klienten».
- Weniger Treffer als Rechnungszeilen -> Fehler «Nicht alle Rechnungsdaten konnten in den Stammdaten
  gefunden werden!» (in der Erweiterung besser: die nicht zugeordneten Namen auflisten).

Strasse/Nr.: Regex `^(.*?)\s+((?:\d+)[a-zA-Z]*)$` auf getrimmtem Text; ohne Treffer ganze Zeichenkette
als Strasse, Nr. leer.

Zielspalten von `QR-Rechnungen.csv` (Komma-getrennt, cp1252, Header in dieser Reihenfolge):

`Lang, IBAN, Cdtr_AdrTp, Cdtr_Name, Cdtr_StrtNmOrAdrLine1, Cdtr_BldgNbOrAdrLine2, Cdtr_PstCd, Cdtr_TwnNm, Cdtr_Ctry, Amt, Ccy, UltmtDbtr_AdrTp, UltmtDbtr_Name, UltmtDbtr_StrtNmOrAdrLine1, UltmtDbtr_BldgNbOrAdrLine2, UltmtDbtr_PstCd, UltmtDbtr_TwnNm, UltmtDbtr_Ctry, RefTp, Ref, Ustrd, StrdBkgInf, AltPmt1, AltPmt2, FileName, Anrede, Nummer`

Festwerte: `Lang=de`, `Cdtr_AdrTp=S`, `Cdtr_Ctry=CH`, `Ccy=CHF`, `UltmtDbtr_AdrTp=S`, `UltmtDbtr_Ctry=CH`,
`RefTp=NON`, `Ustrd=Klientenanteil Spitex`; `Ref`, `StrdBkgInf`, `AltPmt1`, `AltPmt2` leer.
`Cdtr_Name = "{Vorname} {Nachname}"` aus Rechnungssteller. `Amt` mit 2 Nachkommastellen.
`UltmtDbtr_Name = "{Vorname} {Nachname}"` des Klienten. `FileName = "{Nachname}_{Vorname}.pdf"`.
`Anrede`, `Nummer` (= `Klienten-Nr.`) aus Stammdaten.

Referenzergebnis: `data\QR-Rechnungen.csv` (4 Zeilen; Reihenfolge Meier, Steiner, Knüsel, Wagner;
die Datei ist cp1252, `ü/ö` erscheinen deshalb in UTF-8-Viewern als �).
Beispielzeile: `de,CH5691006ZN0KQ3CKLIB8,S,Peter Portmann,Silandro,2,4450,Sissach,CH,48.00,CHF,S,Sandra Meier,Hauptstrasse,43,4450,Sissach,CH,NON,,Klientenanteil Spitex,,,,Meier_Sandra.pdf,Frau,181`

Reihenfolge der Ausgabe = Reihenfolge der Rechnungsdaten (pandas inner merge behält die Reihenfolge des linken Frames).

Beobachtete Inkonsistenz im Python-Repo: `Readme.md` nennt `QR-Rechnungen.csv` und
`QR-Rechnungen_generiert.pdf`; `app.py` schreibt jedoch `QR-Rechnungen-Result.csv` (test_app.py erwartet das).
Für die Erweiterung ohne Bedeutung, nur für Vergleichstests merken.

## 7. Ziel-PDF (Referenz: `data\QR-Rechnungen.pdf`)

- 4 Seiten, eine pro Klient, in CSV-Reihenfolge. Jede Seite ist A4 hoch; oben leer,
  **am unteren Rand der Standard-Zahlteil (105 mm)** nach Swiss QR Bill: Trennlinie mit Scheren,
  links «Empfangsschein», rechts «Zahlteil» mit QR-Code mit Schweizer Kreuz.
- Inhalt Zahlteil: «Konto / Zahlbar an» = IBAN gruppiert (`CH56 9100 6ZN0 KQ3C KLIB 8`),
  Name und Adresse des Rechnungsstellers; «Zusätzliche Informationen» = `Klientenanteil Spitex`;
  «Zahlbar durch» = Klientenname + Strasse Nr. + PLZ Ort; «Währung CHF», «Betrag 48.00».
  Empfangsschein enthält «Annahmestelle».
- Es gibt keine Referenz (`NON`, normale IBAN, keine QR-IBAN) und keinen Anschreiben-Text. `Anrede`,
  `Nummer`, `FileName` erscheinen nicht im PDF (nur in CSV vorhanden). Der Kopftext «QR-RECHNUNG.NET»
  an der Trennlinie stammt von der Website und kann entfallen.
- Beispieldaten (fiktiv): Rechnungssteller Peter Portmann, Silandro 2, 4450 Sissach, IBAN CH5691006ZN0KQ3CKLIB8.
- Umsetzung: `swissqrbill` (liefert die Zahlteil-Grafik inkl. QR) + `pdf-lib`/pdfkit-Seite A4.
  Bei Abweichungen gilt der Swiss-QR-Bill-Standard (SIX) vor dem Pixel-Vergleich.

## 8. Geplante Architektur

```
extension\
  manifest.json
  vite.config.ts
  src\
    core\            reines TS, ohne Browser-API, vollständig getestet
      types.ts
      parseClients.ts      Stammdaten (xlsx/SheetJS) -> Client[]
      parseInvoices.ts     Rechnungs-CSV (Tab, Zeilen 1-4 überspringen) -> Invoice[]
      merge.ts             Join über Name, Fehler/Warnungen
      address.ts           Strasse/Nr. trennen
      mapping.ts           -> Zielzeilen (26 Spalten)
      csv.ts               CSV schreiben + cp1252-Kodierung
      encoding.ts          cp1252-Decoder/-Encoder, Erkennung UTF-8/cp1252
      pipeline.ts          Gesamter Verarbeitungsablauf
      settings.ts          Konfiguration, Rechnungssteller-Validierung, JSON-Import/Export
    pdf\
      validate.ts          Validierung Adressen/IBAN
      payload.ts           Swiss-QR-Bill-Payload
      generator.ts         PDF/ZIP-Erzeugung
    intranet\
      url.ts               URL-Builder & Perioden-Berechnung (Vormonat, Vorjahr-Rollover)
      fetcher.ts           Session-Fetch (arrayBuffer), Login-/Fehlererkennung
      orchestrator.ts      Zusammenspiel Fetch + Stage-1-Pipeline
    content\
      index.ts             Navigation-Injection (VeruA v9.18) & Floating Button
      modal.ts             Dialog Periodenauswahl, PDF/ZIP/CSV-Erstellung & Vorschau/Druck
      storage.ts           Speicherung/Laden Rechnungssteller (browser.storage.local)
      styles.css           Moderne, barrierefreie Styles für Dialog & Buttons
    background\
      index.ts             Ablaufsteuerung & Action-Klick (öffnet Optionsseite)
    options\               Optionsseite Rechnungssteller & Parameter (HTML/TS/CSS)
  icons\                   Erweiterungs-Icons (16, 32, 48, 96, 128 px und SVG)
  test\
    fixtures\              Kopien der Dateien aus ..\data (Testdaten)
    *.test.ts              Vitest (16 Testsuiten, 87 Tests)
  docs\
```

Statusmeldungen (ersetzen Konsolenausgabe): PDF erstellt / Stammdaten nicht gefunden /
Rechnungsdaten nicht gefunden / Klienten nicht zugeordnet (Liste) / anderer Fehler.

Bibliotheken: `xlsx` (SheetJS), `papaparse` (optional), `pdf-lib`, `swissqrbill`, `vitest`, `web-ext`,
`esbuild` oder `vite`.

## 9. Benutzerablauf (Soll)

1. Benutzer ist auf benutzerId.verua.org eingeloggt.
2. Klick auf «QR-Rechnungen erstellen» (Button auf der Seite bzw. Toolbar), Periode wählen.
3. Erweiterung lädt beide Exporte, führt zusammen, erzeugt PDF.
4. Ergebnisseite zeigt Status und die PDF (Download/Druck). Optional CSV-Download.

## 10. Datenschutz

Die Beispieldaten sind fiktiv, die echten Daten enthalten Klientenadressen (Gesundheitsbereich).
Mit lokaler PDF-Erzeugung verlassen die Daten den Rechner nicht mehr (anders als bei qr-rechnung.net).
Zugangsdaten werden nie gespeichert (Session des Browsers). Keine Telemetrie. Keine echten Daten in
Testfixtures committen, sofern nicht anonymisiert.

## 11. Entwicklungsumgebung

- Windows (pwsh), Repo `C:\D\git\SwissQRRechnung`, Python 3.11 (`__pycache__` zeigt cpython-311) vorhanden.
- Für `extension\` wird Node.js (LTS) benötigt. Beim Start von Etappe 1 prüfen: `node -v`, `npm -v`.
- Git: letzter Commit `1443481 update installation and configuration instructions in README`.
  `data\QR-Rechnungen.pdf` war beim Planungsstart untracked.

## 12. Packaging, Distribution und Deployment (Etappe 5)

- **Artefakt-Erzeugung:** `npm run package` führt den Vite-Build aus und bündelt die Erweiterung mit `web-ext build --config web-ext-config.cjs` nach `web-ext-artifacts/swissqrrechnung-1.0.0.zip`.
- **Packaging-Filter:** Quellcode (`src/`), Tests (`test/`), Dokumentation (`docs/`), Node-Module (`node_modules/`) und Hilfsskripte werden ausgeschlossen. Das Zip enthält ausschliesslich die produktionsrelevanten Dateien (`manifest.json`, `dist/`, `options/`, `icons/`).
- **Verteilung:**
  - AMO unlisted Signing via `web-ext sign` zur Erzeugung einer signierten `.xpi` für reguläre Firefox-Installationen.
  - Vorkonfigurierte Vorlagen für Unternehmensrichtlinien (`extension/distribution/policies.json`) zur unternehmensweiten Bereitstellung auf Windows und Linux.
  - Auto-Update-Vorlage (`extension/distribution/updates.json`) für selbstgehostete Updates.
- **Test in sauberem Profil:** `npm start` startet Firefox mit einem temporären, isolierten Profil und vorinstallierter Erweiterung (`web-ext run`).
- **Referenz-Codebase:** Die Python-Dateien (`app.py`, `test_app.py`) im Repo-Root bleiben als historische Referenz und Vergleichstestbasis unverändert erhalten.

## 13. Firefox-spezifische Erkenntnisse & Fehlerbehebung

- **IIFE-Asset-Inlining (`import.meta.url` in Firefox):**
  `pdfkit` enthält `new URL('./data/sRGB_IEC61966_2_1.icc', import.meta.url).href`.
  Vite / Rolldown wandelt dies im `iife`-Format in `new URL('data:...', '' + {}.url).href` um.
  In Firefox (SpiderMonkey) wirft `new URL(..., 'undefined')` beim Laden des Skripts sofort:
  `TypeError: URL constructor: undefined is not a valid URL`.
  Lösung: Im Build-Schritt (`build.js`, `vite.config.ts`) wird dieser Ausdruck zu dem reinen Data-URL-String bereinigt.
- **Button-Injektion in VeruA:**
  Die Untermenüzeile (`start_abrechnung.php`) ist tabellarisch (`tr`/`td`). Direkte Platzierung eines `<button>` in `<tr>`
  wäre invalid. Der Button wird in ein neues `<td>` gepackt und per `targetTd.after(newTd)` exakt rechts neben
  «Offene Rechnungen» (vor «ABMELDEN») eingefügt.


