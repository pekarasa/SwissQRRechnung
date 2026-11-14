# Hinweise für KI-Assistenten

Dieses Projekt ist eine Firefox-Erweiterung in TypeScript, die Schweizer QR-Rechnungen aus dem VeruA-Intranet erzeugt.
Die frühere Python-Version wurde am 14.11.2026 entfernt (siehe Git-Historie).

Vor jeder Arbeit lesen:
1. `docs/SESSION-WISSEN.md`: Entscheide, Datenformate, Mapping, Ziel-PDF, offene Punkte.
2. `docs/ETAPPEN.md`: Etappenplan mit Checkliste. Status dort nachführen (`[ ]`, `[~]`, `[x]`).

Regeln
- Sprache der Kommunikation, Meldungen und Doku: Deutsch. Sourcecode ist in Englisch.
- Referenzdaten sind die fiktiven Beispieldateien in `test/fixtures/`.
- `src/core` darf keine Browser-APIs verwenden (testbar mit Node/Vitest).
- Intranet-Antworten sind iso-8859-1/cp1252: nie `response.text()`, immer `arrayBuffer()` + `TextDecoder`.
- Keine echten Klientendaten committen; nur die fiktiven Beispieldaten aus `test/fixtures/`.
- Neue Erkenntnisse (z. B. echte Server-Antworten) sofort in `docs/SESSION-WISSEN.md` ergänzen.
