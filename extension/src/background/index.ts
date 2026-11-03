declare const browser: {
  action?: {
    onClicked?: {
      addListener: (cb: () => void) => void;
    };
  };
  runtime?: {
    openOptionsPage?: () => Promise<void>;
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
  };
} | undefined;

// When the user clicks the toolbar icon, open the options page
if (typeof browser !== 'undefined' && browser.action?.onClicked) {
  browser.action.onClicked.addListener(() => {
    browser.runtime?.openOptionsPage?.();
  });
} else if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
  chrome.action.onClicked.addListener(() => {
    chrome.runtime?.openOptionsPage?.();
  });
}
