export const MATCH_FORMAT_OPTIONS = [
  { value: 'bo1', label: '단판' },
  { value: 'bo3', label: '3판 2선승' },
  { value: 'bo5', label: '5판 3선승' },
  { value: 'bo7', label: '7판 4선승' },
];

export const TURN_SECONDS_OPTIONS = [
  { value: '10', label: '10초' },
  { value: '15', label: '15초' },
  { value: '30', label: '30초' },
  { value: '60', label: '60초' },
  { value: 'unlimited', label: '무제한' },
];

export function turnSecondsToValue(turnSeconds) {
  return turnSeconds == null ? 'unlimited' : String(turnSeconds);
}

export function valueToTurnSeconds(value) {
  return value === 'unlimited' ? null : Number(value);
}

export function matchFormatLabel(matchFormat) {
  return MATCH_FORMAT_OPTIONS.find((o) => o.value === matchFormat)?.label ?? matchFormat;
}

export function turnSecondsLabel(turnSeconds) {
  return TURN_SECONDS_OPTIONS.find((o) => o.value === turnSecondsToValue(turnSeconds))?.label ?? '무제한';
}
