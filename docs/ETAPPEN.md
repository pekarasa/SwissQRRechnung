# Etappenplan: Firefox-Erweiterung SwissQRRechnung

Hintergrund, Entscheide, Datenformate und Mapping: siehe `SESSION-WISSEN.md`.
Jede Etappe ist einzeln lieferbar und testbar. Status pflegen: `[ ]` offen, `[~]` in Arbeit, `[x]` erledigt.

> **Hinweis (14.11.2026):** Die Python-Version wurde entfernt. Die Pfade `extension\` und `..\data` in den
> Etappen 1 bis 5 beziehen sich auf den damaligen Stand: heute liegt das Projekt im Repository-Root, die
> Testdaten in `test/fixtures/`.

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

## Etappe 4: Optionen, Ergebnisseite, Bedienung `[x]`

Ziel: Fertige, einfache Bedienung ohne Konsole.

Aufgaben
- [x] Optionsseite: Rechnungssteller (`IBAN`, Vorname, Nachname, Strasse, Nr., PLZ, Ort) mit Validierung; Speicherung in `storage.local`; Import der bestehenden `Rechnungssteller.json`.
- [x] Zusätzlich konfigurierbar: Verwendungszweck (`Klientenanteil Spitex`), Kanton-Parameter, Erweiterte URLs (falls sich das Intranet ändert).
- [x] Ergebnisseite: Status (PDF erstellt / Stammdaten fehlen / Rechnungsdaten fehlen / nicht zugeordnete Klienten mit Namen / anderer Fehler), PDF-Vorschau, Download, Drucken, CSV-Download, ZIP-Download von Einzel-PDFs.
- [x] Erststart-Hilfe: wenn Rechnungssteller fehlt oder unvollständig ist -> Hinweis und Button zum Öffnen der Optionsseite.
- [x] Texte auf Deutsch, verständliche Fehlermeldungen (inkl. Hinweis, wo im Intranet exportiert wird).
- [x] Icon, Name, Beschreibung (Icons in 16, 32, 48, 96, 128 px und SVG, Action-Toolbar-Button, options_ui).

Abnahme: Ein Benutzer ohne Vorkenntnisse erstellt die PDF mit zwei Klicks (Button, Periode bestätigen).

---

## Etappe 5: Packaging und Verteilung `[x]`

Aufgaben
- [x] Build (`web-ext build`), Versionierung (SemVer), Changelog.
- [x] Signierung über AMO (unlisted) oder Policy-Installation (`policies.json`) für mehrere Rechner; Auto-Update-URL klären.
- [x] Installationsanleitung für Benutzer (ersetzt Python-Teil im `Readme.md`), inkl. Linux.
- [x] Datenschutzhinweis (keine Datenübertragung ausserhalb des Browsers).
- [x] Abschlusstest vorbereitet (`npm start` für temporäres sauberes Firefox-Profil, 16 Testsuiten mit 87 Tests grün, linter fehlerfrei).
- [x] Entscheid: Python-Version bleibt als unveränderte Referenz im Repo-Root erhalten.

---

## Etappe 6: Einzahlungsscheine für Gemeinden (Restfinanzierung) `[~]`

Ziel: Für konfigurierbare Gemeinden wird pro Klient ein QR-Einzahlungsschein über den Gemeindeanteil
(Restfinanzierung, «Gemeinde KLV») erstellt; «Zahlbar durch» ist die Gemeinde. Entscheide und Datenformate:
`SESSION-WISSEN.md` Abschnitt 14.

Aufgaben
- [x] Doku: Entscheide, Datenformat Gemeindeliste, Etappenplan; Fixture `Liste-aller-Gemeinden-mit-aktiven-Klienten_15-11-2026.xlsx`.
- [x] `parseInvoices.ts`: zusätzlich Spalte 14 (Gemeinde KLV), Monat (1) und Jahr (2) lesen. Referenz-CSV bleibt bytegenau.
- [x] `parseClients.ts`: zusätzlich `Kostenträger Gemeinde` und `ID Gemeinde` lesen (` - ` = keine Gemeinde).
- [x] `parseMunicipalities.ts`: Gemeindeliste (XLSX, Kopfzeile «Name») -> `Municipality[]` mit Adresse (Strasse/Nr. getrennt, Postfach als Ersatz, Zusatz).
- [x] `municipality.ts`: Gemeinderechnungen bilden (Filter auf gewählte Gemeinden, Betrag > 0, Adresse über Namen), Warnungen (Gemeinde nicht in Liste, Betrag 0); Mapping auf die 27 CSV-Spalten.
- [x] Einstellungen: gewählte Gemeinden, Verwendungszweck-Vorlage, Pfad der Gemeindeliste; Migration bestehender Einstellungen.
- [x] Intranet: URL-Builder und Abruf `listen/export_listen_gemeinden_xls.php?id_owner=1&sprache=DE&aktiv=&spitex=0`.
- [x] Orchestrator: Gemeinde-Pipeline (drei Exporte parallel laden).
- [x] PDF: Generator auf allgemeine Zahlteil-Daten umstellen; Gemeinde-PDF und ZIP (`{Gemeinde}_{Nachname}_{Vorname}.pdf`).
- [x] Dialog: Auswahl «Klientenrechnungen / Gemeinderechnungen», Gemeinde-Auswahl (Checkboxen aus der Gemeindeliste, gespeichert), Ergebnisanzeige mit Warnungen.
- [x] Optionsseite: gewählte Gemeinden und Verwendungszweck-Vorlage bearbeiten.
- [x] Abschluss: Version 1.1.0, Changelog, README, `npm test`, `npm run build`, `web-ext lint`.
- [ ] Praxistest im echten VeruA: Abruf der Gemeindeliste, Gemeinde-Auswahl, Druck; Ergebnis in `SESSION-WISSEN.md` Abschnitt 14 nachtragen.

Abnahme: Mit den Fixtures und gewählten Gemeinden «Gemeinde Sissach» und «Gemeinde Gelterkinden» entstehen
4 Einzahlungsscheine (Meier 126.55, Steiner 33.55, Knüsel 90.50, Wagner 157.70), «Zahlbar durch» ist die
jeweilige Gemeinde. Nur «Gemeinde Sissach» gewählt: 3 Scheine (Knüsel entfällt).

---

## Reihenfolge der Arbeit (Empfehlung)

1 -> 3 -> 2 -> 4 -> 5. Begründung: Core und PDF sind ohne Intranetzugang entwickelbar; Etappe 2 braucht die
echten Antworten des Servers (offene Punkte), die Ergebnisse können dann in Etappe 4 integriert werden.

## Offene Entscheide für später

- Einzel-PDFs pro Klient (ZIP) zusätzlich zur Sammel-PDF?
- Soll die Erweiterung die Periode automatisch aus der Seite übernehmen?
- Soll es eine Variante ohne Intranet-Abruf (Dateien per Drag & Drop) als Fallback geben?
