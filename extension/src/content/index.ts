import { openQrBillModal } from './modal.js';
import './styles.css';

function createNavButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'sqr-nav-trigger';
  btn.type = 'button';
  btn.className = 'sqr-nav-btn';
  btn.title = 'Schweizer QR-Rechnungen aus VeruA-Daten erstellen';
  btn.innerHTML = '<span class="sqr-nav-icon">🇨🇭</span> QR-Rechnungen';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openQrBillModal();
  });
  return btn;
}

/**
 * Injects the trigger button into the VeruA navigation bar next to "Offene Rechnungen".
 */
function injectNavButton(): boolean {
  if (document.getElementById('sqr-nav-trigger')) {
    return true; // Already injected
  }

  // Target navigation items in order of preference
  const targetLabels = ['Offene Rechnungen', 'Rechnungsbeträge', 'Daten exportieren'];

  // 1. Look for a specific menu item link or cell containing the label
  const candidates = Array.from(document.querySelectorAll('a, button, td, th, li, span, div'));
  for (const label of targetLabels) {
    for (const el of candidates) {
      const text = el.textContent?.trim() || '';
      // We only want navigation items with relatively short text, not entire card descriptions
      if (text.includes(label) && text.length < 60) {
        const btn = createNavButton();

        // If inside a table cell (typical in VeruA navigation bars)
        const td = el.closest('td, th');
        if (td && td instanceof HTMLElement) {
          const newTd = document.createElement(td.tagName.toLowerCase()) as HTMLTableCellElement;
          newTd.id = 'sqr-nav-cell';
          newTd.style.verticalAlign = 'middle';
          newTd.appendChild(btn);
          td.after(newTd);
          return true;
        }

        // If inside a list item
        const li = el.closest('li');
        if (li && li instanceof HTMLElement) {
          const newLi = document.createElement('li');
          newLi.id = 'sqr-nav-cell';
          newLi.appendChild(btn);
          li.after(newLi);
          return true;
        }

        // If it's an anchor or inline element inside a container
        const anchor = el.closest('a') || el;
        if (anchor && anchor instanceof HTMLElement && anchor.parentElement) {
          anchor.after(btn);
          return true;
        }
      }
    }
  }

  // 2. Fallback: query header or main navigation containers
  const navContainer = document.querySelector('.navigation, #navigation, .menu, #menu, .header, #header');
  if (navContainer && navContainer instanceof HTMLElement) {
    const btn = createNavButton();
    navContainer.appendChild(btn);
    return true;
  }

  return false;
}

/**
 * Injects a floating action button in the bottom right corner.
 * Ensures the extension is always accessible even on non-standard pages.
 */
function injectFloatingButton(): void {
  if (document.getElementById('sqr-fab-trigger')) {
    return;
  }

  const fab = document.createElement('button');
  fab.id = 'sqr-fab-trigger';
  fab.type = 'button';
  fab.className = 'sqr-fab-btn';
  fab.title = 'QR-Rechnungen erstellen';
  fab.innerHTML = '<span style="font-size: 16px;">🇨🇭</span> QR-Rechnungen';
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    openQrBillModal();
  });

  document.body.appendChild(fab);
}

/**
 * Initializes the content script on the page.
 */
function initContentScript(): void {
  const injectedInNav = injectNavButton();
  if (!injectedInNav) {
    // If navigation bar wasn't immediately found, inject FAB and watch DOM for changes
    injectFloatingButton();

    const observer = new MutationObserver(() => {
      if (injectNavButton()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    // Also inject FAB for convenience if desired or keep only nav button
    injectFloatingButton();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
