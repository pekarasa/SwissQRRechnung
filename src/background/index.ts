import { OPEN_OPTIONS_MESSAGE } from '../core/messages.js';

type MessageListener = (message: unknown) => void;

declare const browser: {
  action?: {
    onClicked?: {
      addListener: (cb: () => void) => void;
    };
  };
  runtime?: {
    openOptionsPage?: () => Promise<void>;
    onMessage?: {
      addListener: (cb: MessageListener) => void;
    };
  };
} | undefined;

declare const chrome: {
  action?: {
    onClicked?: {
      addListener: (cb: () => void) => void;
    };
  };
  runtime?: {
    openOptionsPage?: (cb?: () => void) => void;
    onMessage?: {
      addListener: (cb: MessageListener) => void;
    };
  };
} | undefined;

function isOpenOptionsMessage(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === OPEN_OPTIONS_MESSAGE
  );
}

// Toolbar icon click and requests from the content script open the options page
// (runtime.openOptionsPage is not available in content scripts).
if (typeof browser !== 'undefined' && browser.runtime) {
  browser.action?.onClicked?.addListener(() => {
    browser.runtime?.openOptionsPage?.();
  });
  browser.runtime.onMessage?.addListener((message) => {
    if (isOpenOptionsMessage(message)) {
      browser.runtime?.openOptionsPage?.();
    }
  });
} else if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.action?.onClicked?.addListener(() => {
    chrome.runtime?.openOptionsPage?.();
  });
  chrome.runtime.onMessage?.addListener((message) => {
    if (isOpenOptionsMessage(message)) {
      chrome.runtime?.openOptionsPage?.();
    }
  });
}
