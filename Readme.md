# Zweck

Es soll ein Programm entwickelt werden, das einen Ordner auf bestimmte Dateien überwacht. Sobald die Stamm- und Rechnungsdaten gefunden wurden, werden sie in einer neuen Datei zusammengestellt und an eine Website geschickt, um daraus ein PDF zu erstellen.
Das Programm läuft unter Linux.

## Stammdaten

Die Stammdaten sind in einer CSV-Datei gespeichert, deren Namensmuster folgend ist: 'Alle_Kantone_{MM}-{MM}_{YYYY}_{##########}.csv'
Beispiel: data\Alle_Kantone_07-07_2026_1785683522.csv

## Rechnungsdaten

Die Rechnungsdaten sind in einer Excel-Datei gespeichert, deren Namensmuster folgend ist: 'checkDataClients_Klientenstatus_-aktiv_{dd}-{MM}-{yyyy}.xls'
Beispiel: data\checkDataClients_Klientenstatus_-aktiv_02-08-2026.xls

## Konfigurationen

Neben dem zu erstellenden Programm liegt eine Konfigurationsdatei mit dem Namen 'Rechnungssteller.json'.

Beispiel: data\Rechnungssteller.json und data\SwissQRRechnung.json

## Verarbeitung

Wenn sich eine der Dateien verändert, oder eine neuere Datei im Ornder erscheint, werden alle Daten erneut eingelesen und verarbeitet.
Aus den Stammdaten, der Konfigurationsdatei und den Rechnungsdaten wird eine neue Datei mit dem Namen 'QR-Rechnungen.ods' erstellt.
Diese Datei wird an eine Website geschickt. Die Website erstellt daraus eine PDF-Datei, die anschließend heruntergeladen und ausgedruckt werden kann.
