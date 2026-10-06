import { validateField } from './field-validation';

describe('validateField', () => {
  it('requires a value only when the field is required', () => {
    expect(validateField('text', {}, '')).toBeNull();
    expect(validateField('text', { required: 'true' }, '  ')).toBe('This field is required.');
    expect(validateField('choice', { required: 'true' }, '')).toBe('Please choose one.');
    expect(validateField('check', { required: 'true' }, 'false')).toBe('Please check this box.');
    expect(validateField('check', { required: 'true' }, 'true')).toBeNull();
  });

  it('checks text length and pattern (the whole value must match)', () => {
    expect(validateField('text', { min: '3' }, 'ab')).toBe('Enter at least 3 characters.');
    expect(validateField('text', { max: '3' }, 'abcd')).toBe('Enter at most 3 characters.');
    expect(validateField('text', { pattern: '[0-9]{5}' }, '1234a')).toBe("This doesn't have the expected format.");
    expect(validateField('text', { pattern: '[0-9]{5}', patternMessage: 'Five digits, please.' }, '123456')).toBe('Five digits, please.');
    expect(validateField('text', { pattern: '[0-9]{5}' }, '12345')).toBeNull();
    // A broken pattern doesn't lock the form
    expect(validateField('text', { pattern: '([' }, 'x')).toBeNull();
  });

  it('checks numbers against min and max', () => {
    expect(validateField('number', {}, 'abc')).toBe('Enter a number.');
    expect(validateField('number', { min: '1', max: '10' }, '0')).toBe('Enter 1 or more.');
    expect(validateField('number', { min: '1', max: '10' }, '11')).toBe('Enter 10 or less.');
    expect(validateField('number', { min: '1', max: '10' }, '5.5')).toBeNull();
  });

  it('checks dates against the earliest and latest', () => {
    expect(validateField('date', {}, '2026-13-40')).toBe('Enter a valid date.');
    expect(validateField('date', { min: '2026-01-01' }, '2025-12-31')).toBe('Pick 2026-01-01 or later.');
    expect(validateField('date', { max: '2026-12-31' }, '2027-01-01')).toBe('Pick 2026-12-31 or earlier.');
    expect(validateField('date', { min: '2026-01-01', max: '2026-12-31' }, '2026-06-15')).toBeNull();
  });

  it('skips the other checks for an empty optional field', () => {
    expect(validateField('number', { min: '5' }, '')).toBeNull();
    expect(validateField('text', { pattern: '\\d+' }, '')).toBeNull();
  });
});
