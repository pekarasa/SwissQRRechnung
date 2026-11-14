# Changelog

Alle relevanten Änderungen an der Firefox-Erweiterung **SwissQRRechnung** werden in dieser Datei dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Geändert
- Repository auf die Firefox-Erweiterung reduziert: Der Inhalt von `extension/` liegt jetzt im Repository-Root.
- Die Python-Konsolenanwendung (`app.py`, `test_app.py`, `config/`, `data/`) wurde entfernt; sie bleibt in der Git-Historie erhalten.
- Verteilungsvorlagen (`distribution/`) sind nicht mehr Teil des Erweiterungspakets.
- Entwicklungsumgebung (Devcontainer, VS-Code-Tasks) auf Node.js und npm umgestellt.

### Behoben
- Installation der Abhängigkeiten auf Linux: Das Windows-spezifische Paket `@rolldown/binding-win32-x64-msvc` wurde als direkte Abhängigkeit entfernt.

## [1.0.1] - 2026-11-14

### Behoben
- Content-Script: Fehler im URL-Konstruktor behoben und Navigations-Button sauber eingefügt (rechts neben «Offene Rechnungen»).
- Export-Endpunkte für Klienten- und Rechnungsdaten auf die echten Unterverzeichnisse des Servers angepasst.
- Browser-PDF-Erzeugung: Standard-Schriften werden registriert, `Buffer` wird nicht mehr verwendet.
- Drucken des PDFs in Firefox: Einschränkungen durch Cross-Origin-Richtlinien werden abgefangen.
- Button «QR-Rechnungen erstellen» wird nur noch im Tab «Rechnungsverwaltung» eingefügt.

## [1.0.0] - 2026-11-03

### Hinzugefügt
- **Core Pipeline**:
  - Parst Stammdaten aus Excel-Dateien (`checkDataClients_Klientenstatus_-aktiv_*.xls`), XLSX und HTML-Tabellen tolerant mit SheetJS.
  - Parst Rechnungsdaten aus Tab-separierten CSV-Dateien (`Alle_Kantone_*.csv`) mit automatischer Erkennung von Windows-1252 / ISO-8859-1 und UTF-8.
  - Inner Join über Klientennamen (`Nachname, Anrede Vorname`) mit detaillierter Fehler- und Warnungsaufstellung für nicht gefundene Datensätze.
  - Trennung von Strasse und Hausnummer nach Schweizer Standard (`Himmelrain 34a`).
  - Erzeugung der 26-spaltigen Zwischen-CSV (`QR-Rechnungen.csv`) im ANSI/Windows-1252-Format mit bytegenauer Übereinstimmung zur Python-Referenzversion.
- **Intranet-Integration (VeruA)**:
  - Automatischer Download von Stammdaten und Rechnungsdaten direkt aus der bestehenden Benutzersitzung (`credentials: 'include'`).
  - Unterstützung für `https://*.verua.org`.
  - Erkennung abgelaufener Logins und verständliche Fehlermeldungen auf Deutsch.
  - Integrierter Button in der Navigationsleiste (VeruA v9.18) sowie barrierefreier Floating-Button als Fallback.
  - Periodenauswahl mit automatischer Vorbelegung des Vormonats und Jahreswechsel-Unterstützung.
- **Lokale PDF-Erzeugung**:
  - Vollständige lokale Erzeugung des Zahlteils nach offiziellen SIX Swiss QR Bill Spezifikationen (`swissqrbill` & `pdf-lib`).
  - Keine externe Übertragung sensibler Rechnungs- oder Klientendaten an Drittanbieter (qr-rechnung.net entfällt vollständig).
  - Validierung von IBAN (Modulo 97 Prüfsumme) und SIX-Feldlängen vor PDF-Erzeugung.
  - Direkte PDF-Vorschau im Browser, Druckfunktion und PDF-Sammeldatei-Download.
  - Optionaler Download von Einzel-PDFs pro Klient in einem strukturierten ZIP-Archiv.
  - Optionaler Download der Zwischen-CSV zur Kontrolle.
- **Optionen & Konfiguration**:
  - Einstellungsseite für Rechnungssteller-Stammdaten mit IBAN-Formatierung und Validierung.
  - Konfigurierbare Intranet-Exportpfade und Verwendungszweck.
  - Import- und Exportfunktion für Konfigurationsdaten (kompatibel mit `Rechnungssteller.json`).
  - Erststart-Prüfung: Warnt den Benutzer bei noch nicht konfiguriertem Rechnungssteller.
- **Packaging & Verteilung**:
  - Unterstützung für `web-ext build` und signierte/unsignierte XPI-Distribution.
  - Mozilla Firefox Enterprise Policy Bereitstellung via `policies.json`.
  - Vollständige Dokumentation, Benutzeranleitung und Datenschutzhinweise.
