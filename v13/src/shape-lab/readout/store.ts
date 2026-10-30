// A tiny numeric parameter store: values, their ranges, and change listeners.
// Readout controls read and write through it; nothing else holds state.

export interface Spec {
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

export type Values = Record<string, number>;

export interface Store<T extends Values> {
  readonly values: Readonly<T>;
  readonly defaults: Readonly<T>;
  readonly specs: Readonly<Record<keyof T, Spec>>;
  set(key: keyof T, value: number): void;
  /** Back to the initial value. */
  reset(key: keyof T): void;
  /** Position of `key` within its range, 0..1. */
  fraction(key: keyof T): number;
  format(key: keyof T): string;
  subscribe(listener: () => void): () => void;
}

export function createStore<T extends Values>(
  initial: T,
  specs: Record<keyof T, Spec>,
  /** Cross-value rules applied after every change (with the key that changed), e.g. an index bounded by a count. */
  constrain: (values: T, changed: keyof T) => void = () => {},
): Store<T> {
  const values = { ...initial };
  const listeners = new Set<() => void>();

  const snap = (key: keyof T, value: number) => {
    const { min, max, step } = specs[key];
    const stepped = min + Math.round((value - min) / step) * step;
    return Number(Math.min(max, Math.max(min, stepped)).toFixed(6));
  };

  const defaults = { ...initial };

  const store: Store<T> = {
    values,
    defaults,
    specs,
    set(key, value) {
      if (!Number.isFinite(value)) return;
      const next = snap(key, value);
      if (next === values[key]) return;
      values[key] = next as T[keyof T];
      constrain(values, key);
      for (const listener of listeners) listener();
    },
    reset(key) {
      store.set(key, defaults[key]);
    },
    fraction(key) {
      const { min, max } = specs[key];
      return (values[key] - min) / (max - min);
    },
    format(key) {
      return specs[key].format(values[key]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}
