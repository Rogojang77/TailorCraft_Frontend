/**
 * Calculated field evaluation.
 * Pure functions only; no side effects, no backend, no schema assumptions.
 * Calculated values are never persisted; they are derived from form state only.
 * Calculated fields always produce number | undefined.
 */

import type { MeasurementValue } from '@/types/measurement';
import { filterDefinitionsWithValidKey } from './measurementDefensive';

export interface CalculatedDef {
  key: string;
  inputType?: string;
  formula?: string;
  dependsOn?: string[];
}

/** Keys of calculated fields (never persisted). Use when filtering payloads for save. */
export function getCalculatedKeys(definitions: CalculatedDef[]): Set<string> {
  const valid = filterDefinitionsWithValidKey(definitions);
  return new Set(
    valid.filter((d) => d.inputType === 'calculated').map((d) => d.key)
  );
}

/**
 * Evaluate all calculated fields from definitions and current form values.
 * - Uses formula + dependsOn only.
 * - Missing dependencies → undefined (display "—").
 * - Circular dependencies → detected and ignored (undefined).
 * - No persistence, no side effects.
 * - Calculated fields always produce number | undefined.
 */
export function evaluateCalculatedFields(
  definitions: CalculatedDef[],
  values: Record<string, MeasurementValue>
): Record<string, number | undefined> {
  const valid = filterDefinitionsWithValidKey(definitions);
  const calc = valid.filter(
    (d) => d.inputType === 'calculated' && typeof d.formula === 'string' && Array.isArray(d.dependsOn) && d.dependsOn.length > 0
  );
  if (calc.length === 0) return {};

  const calcKeys = new Set(calc.map((d) => d.key));
  const byKey = new Map<string, CalculatedDef>();
  calc.forEach((d) => byKey.set(d.key, d));

  const { acyclic } = detectCycles(calc, calcKeys);
  const sorted = topoSort(calc, acyclic, calcKeys);

  const result: Record<string, number | undefined> = {};
  const resolved = new Map<string, number>();
  const vals = values ?? {};
  for (const k of Object.keys(vals)) {
    if (calcKeys.has(k)) continue;
    const v = parseNum(vals[k]);
    if (v !== undefined) resolved.set(k, v);
  }

  for (const key of sorted) {
    const def = byKey.get(key);
    if (!def?.formula || !def.dependsOn) continue;

    const valueMap: Record<string, number> = {};
    let missing = false;
    for (const dep of def.dependsOn) {
      let n: number | undefined;
      if (resolved.has(dep)) {
        n = resolved.get(dep);
      } else {
        n = parseNum(vals[dep]);
      }
      if (n === undefined) {
        missing = true;
        break;
      }
      valueMap[dep] = n;
    }
    if (missing) {
      result[key] = undefined;
      continue;
    }

    const evaluated = evaluateFormula(def.formula, def.dependsOn, valueMap);
    if (evaluated === undefined) {
      result[key] = undefined;
      continue;
    }
    result[key] = evaluated;
    resolved.set(key, evaluated);
  }

  for (const key of acyclic) {
    if (!(key in result)) result[key] = undefined;
  }
  for (const key of Array.from(calcKeys).filter((k) => !acyclic.has(k))) {
    result[key] = undefined;
  }

  return result;
}

function parseNum(v: MeasurementValue): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Build dependency graph between calculated keys only.
 * Returns sets: all calculated keys, and those participating in cycles.
 */
function detectCycles(
  calc: CalculatedDef[],
  calcKeys: Set<string>
): { acyclic: Set<string>; cyclic: Set<string> } {
  const edges = new Map<string, Set<string>>();
  for (const d of calc) {
    const deps = (d.dependsOn ?? []).filter((k) => calcKeys.has(k));
    edges.set(d.key, new Set(deps));
  }

  const cyclic = new Set<string>();
  const state = new Map<string, 'white' | 'gray' | 'black'>();
  calcKeys.forEach((k) => state.set(k, 'white'));

  const stack: string[] = [];
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  let idx = 0;

  function strongConnect(v: string): void {
    index.set(v, idx);
    low.set(v, idx);
    idx++;
    state.set(v, 'gray');
    stack.push(v);

    for (const w of edges.get(v) ?? []) {
      if (state.get(w) === 'white') {
        strongConnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (stack.includes(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }

    if (low.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        state.set(w, 'black');
        scc.push(w);
      } while (w !== v);
      const isCycle = scc.length > 1 || (scc.length === 1 && edges.get(scc[0]!)?.has(scc[0]!));
      if (isCycle) scc.forEach((k) => cyclic.add(k));
    }
  }

  calcKeys.forEach((k) => {
    if (state.get(k) === 'white') strongConnect(k);
  });

  const acyclic = new Set<string>(calcKeys);
  cyclic.forEach((k) => acyclic.delete(k));
  return { acyclic, cyclic };
}

function topoSort(calc: CalculatedDef[], acyclic: Set<string>, calcKeys: Set<string>): string[] {
  const edges = new Map<string, Set<string>>();
  const calcList = Array.from(acyclic);
  const byKey = new Map(calc.map((d) => [d.key, d]));

  for (const k of calcList) {
    const deps = (byKey.get(k)?.dependsOn ?? []).filter((d) => calcKeys.has(d) && acyclic.has(d));
    edges.set(k, new Set(deps));
  }

  const order: string[] = [];
  const visited = new Set<string>();

  function visit(v: string): void {
    if (visited.has(v)) return;
    visited.add(v);
    for (const w of edges.get(v) ?? []) {
      visit(w);
    }
    order.push(v);
  }

  calcList.forEach((k) => visit(k));
  return order;
}

/**
 * Safe formula evaluator. Supports: numbers, identifiers (dependsOn), + - * /, (), round(expr).
 * No eval, no Function. Identifiers must be in valueMap; all values are numbers.
 */
function evaluateFormula(
  formula: string,
  dependsOn: string[],
  valueMap: Record<string, number>
): number | undefined {
  const allowed = new Set(dependsOn);
  const tokens = tokenize(formula);
  let i = 0;

  function peek(): { type: string; raw?: string; value?: number } | null {
    return i < tokens.length ? tokens[i]! : null;
  }
  function advance(): { type: string; raw?: string; value?: number } | null {
    return i < tokens.length ? tokens[i++]! : null;
  }

  function parseExpr(): number | undefined {
    let left = parseTerm();
    if (left === undefined) return undefined;
    for (;;) {
      const t = peek();
      if (t?.type === 'op' && (t.raw === '+' || t.raw === '-')) {
        advance();
        const right = parseTerm();
        if (right === undefined) return undefined;
        left = t.raw === '+' ? left + right : left - right;
      } else break;
    }
    return left;
  }

  function parseTerm(): number | undefined {
    let left = parseFactor();
    if (left === undefined) return undefined;
    for (;;) {
      const t = peek();
      if (t?.type === 'op' && (t.raw === '*' || t.raw === '/')) {
        advance();
        const right = parseFactor();
        if (right === undefined) return undefined;
        if (t.raw === '/' && right === 0) return undefined;
        left = t.raw === '*' ? left * right : left / right;
      } else break;
    }
    return left;
  }

  function parseFactor(): number | undefined {
    const t = advance();
    if (!t) return undefined;
    if (t.type === 'num' && t.value !== undefined) return t.value;
    if (t.type === 'id' && t.raw && allowed.has(t.raw)) {
      const v = valueMap[t.raw];
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    }
    if (t.type === 'op' && t.raw === '-') {
      const v = parseFactor();
      return v === undefined ? undefined : -v;
    }
    if (t.type === 'op' && t.raw === '(') {
      const v = parseExpr();
      const close = advance();
      if (close?.type !== 'op' || close.raw !== ')') return undefined;
      return v;
    }
    if (t.type === 'fn' && t.raw === 'round') {
      const open = advance();
      if (open?.type !== 'op' || open.raw !== '(') return undefined;
      const v = parseExpr();
      const close = advance();
      if (close?.type !== 'op' || close.raw !== ')') return undefined;
      return v === undefined ? undefined : Math.round(v);
    }
    return undefined;
  }

  const out = parseExpr();
  if (peek() !== null) return undefined;
  return out;
}

type Token = { type: 'num'; value: number } | { type: 'id' | 'op' | 'fn'; raw: string };

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  const r = s.replace(/\s+/g, ' ').trim();
  let i = 0;

  const num = /^-?\d*\.?\d+/y;
  const id = /^[a-zA-Z_][a-zA-Z0-9_]*/y;

  while (i < r.length) {
    if (r[i] === ' ') {
      i++;
      continue;
    }
    num.lastIndex = i;
    if (num.test(r)) {
      const raw = r.slice(i, num.lastIndex);
      out.push({ type: 'num', value: Number(raw) });
      i = num.lastIndex;
      continue;
    }
    id.lastIndex = i;
    if (id.test(r)) {
      const raw = r.slice(i, id.lastIndex);
      out.push(raw === 'round' ? { type: 'fn', raw } : { type: 'id', raw });
      i = id.lastIndex;
      continue;
    }
    const c = r[i];
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '(' || c === ')' || c === ',') {
      out.push({ type: 'op', raw: c });
      i++;
      continue;
    }
    return [];
  }
  return out;
}
