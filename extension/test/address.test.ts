import { describe, it, expect } from 'vitest';
import { splitStreetAndNumber } from '../src/core/address.js';

describe('address', () => {
  it('splits simple street and number', () => {
    expect(splitStreetAndNumber('Hauptstrasse 43')).toEqual({
      street: 'Hauptstrasse',
      buildingNumber: '43',
    });
  });

  it('splits street with letter suffix', () => {
    expect(splitStreetAndNumber('Himmelrain 34a')).toEqual({
      street: 'Himmelrain',
      buildingNumber: '34a',
    });
  });

  it('splits multi-word street names', () => {
    expect(splitStreetAndNumber('Rue de la Gare 12')).toEqual({
      street: 'Rue de la Gare',
      buildingNumber: '12',
    });
  });

  it('handles number with spaced letter suffix', () => {
    expect(splitStreetAndNumber('Bahnhofstr. 5 b')).toEqual({
      street: 'Bahnhofstr.',
      buildingNumber: '5 b',
    });
  });

  it('returns entire string as street when no number is present', () => {
    expect(splitStreetAndNumber('Postfach')).toEqual({
      street: 'Postfach',
      buildingNumber: '',
    });
  });

  it('handles empty or whitespace-only inputs', () => {
    expect(splitStreetAndNumber('')).toEqual({
      street: '',
      buildingNumber: '',
    });
    expect(splitStreetAndNumber('   ')).toEqual({
      street: '',
      buildingNumber: '',
    });
    expect(splitStreetAndNumber(null)).toEqual({
      street: '',
      buildingNumber: '',
    });
    expect(splitStreetAndNumber(undefined)).toEqual({
      street: '',
      buildingNumber: '',
    });
  });
});
