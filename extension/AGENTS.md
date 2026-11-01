# Hinweise für KI-Assistenten (Ordner `extension\`)

Dieses Projekt ist die Neuentwicklung von `..\app.py` (Python) als Firefox-Erweiterung in TypeScript.

Vor jeder Arbeit lesen:
1. `docs/SESSION-WISSEN.md`: Entscheide, Datenformate, Mapping, Ziel-PDF, offene Punkte.
2. `docs/ETAPPEN.md`: Etappenplan mit Checkliste. Status dort nachführen (`[ ]`, `[~]`, `[x]`).

Regeln
- Sprache der Kommunikation, Meldungen und Doku: Deutsch. Sourcecode ist in Englisch.
- Referenzverhalten ist die Python-Version (`..\app.py`, `..\Readme.md`) und die Dateien in `..\data`.
- `src/core` darf keine Browser-APIs verwenden (testbar mit Node/Vitest).
- Intranet-Antworten sind iso-8859-1/cp1252: nie `response.text()`, immer `arrayBuffer()` + `TextDecoder`.
- Keine echten Klientendaten committen; nur die fiktiven Beispieldaten aus `..\data`.
- Die Python-Dateien im Repo-Root nicht verändern, solange nicht ausdrücklich verlangt.
- Neue Erkenntnisse (z. B. echte Server-Antworten) sofort in `docs/SESSION-WISSEN.md` ergänzen.
