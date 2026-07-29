Ich habe die Grundstruktur für ein Firefox Add-on in `d:/git/SwissQRRechnung` erstellt. Es ist wie folgt aufgebaut:

1. __`manifest.json`__: Definiert die Erweiterung und weist Firefox an, die Skripte auf allen Webseiten zu laden.
2. __`content.js`__: Das Herzstück. Es fügt einen Button mit der ID `my-custom-addon-button` zum Body jeder Webseite hinzu. Der Button löst beim Klicken derzeit einen einfachen `alert` aus. Ein `MutationObserver` stellt sicher, dass der Button auch auf modernen Webseiten (SPAs) erhalten bleibt, die Inhalte dynamisch nachladen.
3. __`style.css`__: Sorgt dafür, dass der Button unten rechts fixiert erscheint und gut sichtbar ist.

### So testen Sie das Add-on in Firefox:

1. Öffnen Sie Firefox und geben Sie `about:debugging#/runtime/this-firefox` in die Adresszeile ein.
2. Klicken Sie auf __"Temporäres Add-on laden..."__ (Load Temporary Add-on...).
3. Wählen Sie die Datei `manifest.json` in Ihrem Verzeichnis `d:/git/SwissQRRechnung` aus.
4. Besuchen Sie eine beliebige Webseite (z. B. google.ch). Sie sollten nun unten rechts einen orangefarbenen Button "QR-Aktion" sehen.

Das Add-on kann nun beliebig erweitert werden, um z. B. Daten von der Webseite zu lesen oder mit APIs zu kommunizieren.
