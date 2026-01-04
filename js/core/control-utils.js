const precisionForStep = (step) => {
  if (!Number.isFinite(step)) return 3;
  const parts = step.toString().split('.');
  return Math.min(6, parts[1]?.length ? parts[1].length + 1 : 3);
};

export function getControlElement(controlId, doc = document) {
  return doc?.getElementById?.(controlId) || null;
}

export function getControlMeta(controlId, doc = document) {
  const el = getControlElement(controlId, doc);
  if (!el || el.type === 'checkbox') return null;

  const min = Number(el.min);
  const max = Number(el.max);
  const step = Number(el.step);

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    step: Number.isFinite(step) && step > 0 ? step : undefined
  };
}

export function clampControlValue(controlId, value, doc = document, overrides = {}) {
  if (typeof value !== 'number') return value;
  const meta = getControlMeta(controlId, doc);
  const bounds = meta || {};

  const min = typeof overrides.min === 'number' ? overrides.min : bounds.min;
  const max = typeof overrides.max === 'number' ? overrides.max : bounds.max;
  const step = typeof overrides.step === 'number' ? overrides.step : bounds.step;

  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);

  if (typeof step === 'number') {
    const base = typeof min === 'number' ? min : 0;
    next = base + Math.round((next - base) / step) * step;
    next = Number(next.toFixed(precisionForStep(step)));
  }

  return next;
}

export function readControlValue(controlId, doc = document) {
  const el = getControlElement(controlId, doc);
  if (!el) return undefined;
  if (el.type === 'checkbox') return Boolean(el.checked);
  const numeric = parseFloat(el.value);
  return Number.isNaN(numeric) ? undefined : numeric;
}
