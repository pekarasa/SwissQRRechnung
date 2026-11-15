import type { AppSettings } from '../core/settings.js';
import type { Municipality } from '../core/types.js';
import { loadMunicipalityList } from '../intranet/orchestrator.js';

export interface MunicipalitySelectionControl {
  element: HTMLElement;
  /** Loads the municipality list from VeruA once and renders the checkboxes. */
  load: () => Promise<void>;
  getSelected: () => string[];
}

function formatAddress(m: Municipality): string {
  const street = m.streetAndNumber || m.postBox;
  return [m.addition, street, `${m.zipCode} ${m.city}`.trim()].filter(Boolean).join(', ');
}

/**
 * Creates the municipality selection (checkbox list) for the dialog.
 * Preselects the municipalities stored in the settings.
 */
export function createMunicipalitySelection(settings: AppSettings): MunicipalitySelectionControl {
  const preselected = new Set(settings.municipalityBilling.selected.map((n) => n.toLowerCase()));
  let loadPromise: Promise<void> | null = null;

  const section = document.createElement('div');

  const title = document.createElement('div');
  title.className = 'sqr-section-title';
  title.textContent = 'Gemeinden auswählen';
  section.appendChild(title);

  const hint = document.createElement('div');
  hint.className = 'sqr-hint';
  hint.textContent =
    'Für Klienten der gewählten Gemeinden wird je ein Einzahlungsschein über den Gemeindeanteil (Restfinanzierung KLV) erstellt. Die Auswahl wird gespeichert.';
  section.appendChild(hint);

  const list = document.createElement('div');
  list.className = 'sqr-checkbox-list';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Gemeinden');
  section.appendChild(list);

  const showMessage = (text: string, isError = false) => {
    list.textContent = '';
    const msg = document.createElement('div');
    msg.className = isError ? 'sqr-hint sqr-hint-error' : 'sqr-hint';
    msg.textContent = text;
    list.appendChild(msg);
  };

  const addCheckbox = (name: string, detail: string, checked: boolean) => {
    const label = document.createElement('label');
    label.className = 'sqr-checkbox';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = name;
    input.checked = checked;

    const text = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = name;
    text.appendChild(strong);
    if (detail) {
      const small = document.createElement('small');
      small.textContent = ` – ${detail}`;
      text.appendChild(small);
    }

    label.appendChild(input);
    label.appendChild(text);
    list.appendChild(label);
  };

  const render = (municipalities: Municipality[]) => {
    list.textContent = '';
    if (municipalities.length === 0) {
      showMessage('Die Gemeindeliste aus VeruA ist leer.', true);
      return;
    }

    const known = new Set<string>();
    for (const m of municipalities) {
      known.add(m.name.toLowerCase());
      addCheckbox(m.name, formatAddress(m), preselected.has(m.name.toLowerCase()));
    }

    for (const name of settings.municipalityBilling.selected) {
      if (!known.has(name.toLowerCase())) {
        addCheckbox(name, 'nicht in der VeruA-Gemeindeliste', true);
      }
    }
  };

  const load = (): Promise<void> => {
    if (!loadPromise) {
      showMessage('Lade Gemeindeliste aus VeruA...');
      loadPromise = loadMunicipalityList({
        exportParams: settings.exportParams,
        customUrls: settings.customUrls,
      })
        .then(render)
        .catch((err: unknown) => {
          loadPromise = null;
          showMessage(
            `Gemeindeliste konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`,
            true,
          );
        });
    }
    return loadPromise;
  };

  const getSelected = (): string[] =>
    Array.from(list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
      .filter((input) => input.checked)
      .map((input) => input.value);

  return { element: section, load, getSelected };
}
