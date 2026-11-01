export interface SplitAddress {
  street: string;
  buildingNumber: string;
}

/**
 * Splits a combined street and building number string into separate street and number fields.
 * Follows the Python reference logic with enhanced support for letter suffixes (e.g. "34a", "5 b").
 *
 * If no building number can be identified, the entire trimmed string is returned as street name.
 */
export function splitStreetAndNumber(rawAddress: string | null | undefined): SplitAddress {
  if (!rawAddress) {
    return { street: '', buildingNumber: '' };
  }

  const trimmed = rawAddress.trim();
  if (!trimmed) {
    return { street: '', buildingNumber: '' };
  }

  // Street name followed by digits with optional letter suffix (e.g. "34a" or "5 b")
  const match = /^(.*?)\s+((?:\d+)(?:\s*[a-zA-Z]+)?)$/.exec(trimmed);
  if (match && match[1] && match[2]) {
    return {
      street: match[1].trim(),
      buildingNumber: match[2].trim(),
    };
  }

  return {
    street: trimmed,
    buildingNumber: '',
  };
}
