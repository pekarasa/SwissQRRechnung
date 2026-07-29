/**
 * Erzeugt einen Button und fügt ihn in die Webseite ein.
 */
function injectButton() {
    // Verhindern, dass der Button mehrfach eingefügt wird
    if (document.getElementById('my-custom-addon-button')) return;

    const button = document.createElement('button');
    button.id = 'my-custom-addon-button';
    button.innerText = 'QR-Aktion';
    button.title = 'Klicken Sie hier, um eine Funktion auszuführen';

    // Funktion, die beim Klicken ausgeführt wird
    button.addEventListener('click', () => {
        alert('Button wurde geklickt! Hier können nun weitere Funktionen implementiert werden.');
        console.log('Add-on Aktion ausgeführt auf:', window.location.href);
    });

    // Button zum Body hinzufügen
    document.body.appendChild(button);
}

// Button injizieren, wenn das Dokument geladen ist
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injectButton();
} else {
    window.addEventListener('DOMContentLoaded', injectButton);
}

// Optional: MutationObserver für dynamisch ladende Seiten (z.B. SPAs)
const observer = new MutationObserver((mutations) => {
    injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });
