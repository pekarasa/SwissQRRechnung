# Etappenplan: Firefox-Erweiterung SwissQRRechnung

Hintergrund, Entscheide, Datenformate und Mapping: siehe `SESSION-WISSEN.md`.
Jede Etappe ist einzeln lieferbar und testbar. Status pflegen: `[ ]` offen, `[~]` in Arbeit, `[x]` erledigt.

Reihenfolge ist empfohlen; Etappe 1 und 3 sind unabhängig vom Quellsystem und können ohne Intranetzugang
erledigt werden.

---

## Etappe 1: Core (Parser, Merge, Mapping, CSV) `[x]`

Ziel: Aus den Beispieldateien entsteht dieselbe `QR-Rechnungen.csv` wie in der Python-Version.

Aufgaben
- [x] `extension\` anlegen: `package.json`, `tsconfig.json`, Vitest, ESLint/Prettier (optional), `.gitignore` (`node_modules`, `dist`).
- [x] `node -v` / `npm -v` prüfen.
- [x] Fixtures aus `..\data` nach `extension\test\fixtures` kopieren (Stammdaten-XLS, Rechnungs-CSV, Referenz-CSV, Referenz-PDF).
- [x] `encoding.ts`: cp1252 decodieren/encodieren, Erkennung UTF-8 vs. cp1252.
- [x] `parseInvoices.ts`: Tab-CSV, Kopf überspringen, Spalte 0 und 8, `Gesamt*` und Leerzeilen ignorieren, Tausender-Hochkomma.
- [x] `parseClients.ts`: SheetJS-Parser, tolerant bei defekter Workbook-Struktur; Nicht-Klienten (leere Anrede/Name) ignorieren; PLZ als Ganzzahl-String.
- [x] `address.ts`: Strasse/Nr. trennen (Regex aus Python, Tests: `Himmelrain 34a`, `Hauptstrasse 43`, ohne Nummer, Zusätze wie `Bahnhofstr. 5 b`, `Rue de la Gare 12`).
- [x] `merge.ts`: Join über `Nachname, Anrede Vorname`; Ergebnis mit `matched[]` und `unmatched[]` (nicht werfen, sondern auswertbar).
- [x] `mapping.ts` + `csv.ts`: 26 Zielspalten in Originalreihenfolge, `Amt` mit 2 Nachkommastellen, Escaping (Komma/Anführungszeichen), Zeilenende wie Referenz prüfen (CRLF/LF).
- [x] Test: Ausgabe (cp1252-Bytes) == `data\QR-Rechnungen.csv` bytegenau (ggf. Zeilenende angleichen und dokumentieren).
- [x] Tests für Fehlerfälle: Stammdaten leer, Rechnungsdaten leer, Klient ohne Stammdaten, Betrag ungültig.

Abnahme: `npm test` grün; Referenz-CSV wird reproduziert.

---

## Etappe 2: Datenabruf aus dem Intranet `[x]`

Ziel: Beide Exporte werden per Klick aus der eingeloggten Session geholt.

Aufgaben
- [x] Offene Punkte 1-5 aus `SESSION-WISSEN.md` Abschnitt 4 geklärt & umgesetzt (URL-Generierung ohne `%27`, Parameter owner/sprache/kuerzel_kanton/id_kanton, automatische Kodierungserkennung).
- [x] Format-Toleranz in Parsern: `parseClients` liest XLS/XLSX/HTML-Tabellen tolerant, `parseInvoices` decodiert ISO-8859-1/Windows-1252/UTF-8.
- [x] `manifest.json` (Manifest V3, Host-Permission `*://*.verua.org/*`, Content-Script auf VeruA-Seiten, `storage`).
- [x] Content-Script: Button «QR-Rechnungen erstellen» (Nav-Leiste VeruA v9.18 + Floating-Button Fallback); Periodenauswahl (Jahr, von/bis Monat; Vorbelegung Vormonat).
- [x] `fetch` beider URLs mit `credentials: 'include'`, Antwort per `arrayBuffer` lesen und mit erkannter Kodierung decodieren (Seite ist iso-8859-1).
- [x] Fehlerbehandlung: Login abgelaufen (Antwort ist HTML-Loginseite statt Datei), HTTP-Fehler, leere Antwort -> Meldungen «Stammdaten/Rechnungsdaten nicht gefunden» auf Deutsch.
- [x] Mit `web-ext lint` (0 Fehler, 0 Warnungen) und `npm run build` validiert.

Abnahme: Klick auf den Button liefert beide Dateien im Speicher und die Etappe-1-Pipeline erzeugt die CSV.

---

## Etappe 3: PDF lokal erzeugen `[x]`

Ziel: Gleichwertiges PDF wie `data\QR-Rechnungen.pdf`, ohne qr-rechnung.net.

Aufgaben
- [x] Prototyp mit `swissqrbill` + `pdf-lib`: A4, Zahlteil unten, eine Seite pro Klient in CSV-Reihenfolge.
- [x] Inhalt gemäss `SESSION-WISSEN.md` Abschnitt 7 (IBAN gruppiert, `NON`, «Klientenanteil Spitex»).
- [x] Validierung vor der Erzeugung: IBAN (Prüfsumme), Länge/Zeichensatz der Adressfelder nach SIX-Standard, Betrag > 0.
- [x] Umlaute korrekt (Köhlerweg, Knüsel).
- [x] Vergleich mit Referenz-PDF: Text je Seite (pdf-parse) und visuell; QR-Payload mit einem QR-Scanner/Bibliothek prüfen.
- [x] Optional: ein Einzel-PDF pro Klient (`FileName`) als ZIP.

Abnahme: PDF in Referenz und neue PDF sind inhaltlich gleich, QR-Code liest sich in einer Bank-App/Validator.

---

## Etappe 4: Optionen, Ergebnisseite, Bedienung `[ ]`

Ziel: Fertige, einfache Bedienung ohne Konsole.

Aufgaben
- [ ] Optionsseite: Rechnungssteller (`IBAN`, Vorname, Nachname, Strasse, Nr., PLZ, Ort) mit Validierung; Speicherung in `storage.local`; Import der bestehenden `Rechnungssteller.json`.
- [ ] Zusätzlich konfigurierbar: Verwendungszweck (`Klientenanteil Spitex`), Kanton-Parameter, Erweiterte URLs (falls sich das Intranet ändert).
- [ ] Ergebnisseite: Status (PDF erstellt / Stammdaten fehlen / Rechnungsdaten fehlen / nicht zugeordnete Klienten mit Namen / anderer Fehler), PDF-Vorschau, Download, Drucken, CSV-Download.
- [ ] Erststart-Hilfe: wenn Rechnungssteller fehlt -> Optionsseite öffnen.
- [ ] Texte auf Deutsch, verständliche Fehlermeldungen (inkl. Hinweis, wo im Intranet exportiert wird).
- [ ] Icon, Name, Beschreibung.

Abnahme: Ein Benutzer ohne Vorkenntnisse erstellt die PDF mit zwei Klicks (Button, Periode bestätigen).

---

## Etappe 5: Packaging und Verteilung `[ ]`

Aufgaben
- [ ] Build (`web-ext build`), Versionierung (SemVer), Changelog.
- [ ] Signierung über AMO (unlisted) oder Policy-Installation (`policies.json`) für mehrere Rechner; Auto-Update-URL klären.
- [ ] Installationsanleitung für Benutzer (ersetzt Python-Teil im `Readme.md`), inkl. Linux.
- [ ] Datenschutzhinweis (keine Datenübertragung ausserhalb des Browsers).
- [ ] Abschlusstest auf sauberem Firefox-Profil mit echten Daten.
- [ ] Entscheid: Python-Version im Repo-Root archivieren oder entfernen.

---

## Reihenfolge der Arbeit (Empfehlung)

1 -> 3 -> 2 -> 4 -> 5. Begründung: Core und PDF sind ohne Intranetzugang entwickelbar; Etappe 2 braucht die
echten Antworten des Servers (offene Punkte), die Ergebnisse können dann in Etappe 4 integriert werden.

## Offene Entscheide für später

- Einzel-PDFs pro Klient (ZIP) zusätzlich zur Sammel-PDF?
- Soll die Erweiterung die Periode automatisch aus der Seite übernehmen?
- Soll es eine Variante ohne Intranet-Abruf (Dateien per Drag & Drop) als Fallback geben?
