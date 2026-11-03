import { openQrBillModal } from './modal.js';
import './styles.css';

/**
 * Searches the DOM for navigation elements on VeruA pages (as seen in v9.18).
 */
function findVeruANavigationBar(): HTMLElement | null {
  // 1. Try finding links or anchors containing "Offene Rechnungen" or "Daten exportieren"
  const candidates = Array.from(document.querySelectorAll('a, span, td, div'));
  for (const el of candidates) {
    const text = el.textContent?.trim() || '';
    if (text.includes('Offene Rechnungen') || text.includes('Rechnungsbeträge')) {
      const parent = el.closest('tr, div, ul, p');
      if (parent && parent instanceof HTMLElement) {
        return parent;
      }
    }
  }

  // 2. Fallback: query header or main navigation containers
  const navContainer = document.querySelector('.navigation, #navigation, .menu, #menu, .header, #header');
  if (navContainer && navContainer instanceof HTMLElement) {
    return navContainer;
  }

  return null;
}

/**
 * Injects the trigger button into the VeruA navigation bar if available.
 */
function injectNavButton(): boolean {
  if (document.getElementById('sqr-nav-trigger')) {
    return true; // Already injected
  }

  const nav = findVeruANavigationBar();
  if (!nav) {
    return false;
  }

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

  nav.appendChild(btn);
  return true;
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
