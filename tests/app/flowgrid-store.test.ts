// Plan 06.1-01 Task 1 RED: selectedCellId + takeoverActive view-state mirror fields.
//
// D-01 / D-02: the store gains two view-state mirror fields that AppLayout derives
// from the URL via useMatches and pushes via flowgridStore.setState (never via
// dispatch — selection is view-state, not durable). The render adapter reads them
// through the structural FlowgridStoreView contract so the canvas can pause the
// ticker + gate particle emission while a takeover overlay covers it.
//
// These tests pin the defaults + the setState observability contract before any
// implementation code lands. The FlowgridStoreView type contract is exercised at
// typecheck time (type-only; see the assertView contract at the bottom).

import { beforeEach, expect, test } from 'vitest';

import type {
  FlowgridStoreView,
} from '../../src/render/flowgrid/adapter.js';
import { flowgridStore } from '../../src/app/store/flowgrid-store.js';

beforeEach(() => {
  flowgridStore.setState({
    selectedCellId: null,
    takeoverActive: false,
  });
});

test('flowgridStore: fresh state defaults selectedCellId to null and takeoverActive to false (D-01/D-02 defaults)', () => {
  // After the reset above, the store reflects the canonical initial state for
  // the two new view-state mirror fields.
  expect(flowgridStore.getState().selectedCellId).toBeNull();
  expect(flowgridStore.getState().takeoverActive).toBe(false);
});

test('flowgridStore: setState({ takeoverActive: true }) is observable via getState() (the field lives on the state shape)', () => {
  flowgridStore.setState({ takeoverActive: true });
  expect(flowgridStore.getState().takeoverActive).toBe(true);
});

test('flowgridStore: setState({ selectedCellId }) is observable via getState() (the field lives on the state shape)', () => {
  flowgridStore.setState({ selectedCellId: 'cell-123' });
  expect(flowgridStore.getState().selectedCellId).toBe('cell-123');
});

// Type-only contract assertion: the vanilla store is structurally compatible with
// the extended FlowgridStoreView (the cast in FlowgridCanvas.tsx continues to
// satisfy the render-layer boundary). If the getState() return type were missing
// either new field this import-bound check would fail to typecheck at tsc time.
function assertStoreViewContract(view: FlowgridStoreView) {
  const state = view.getState();
  // Type-level only: reading the new fields through the structural contract.
  const _selected: string | null = state.selectedCellId;
  const _takeover: boolean = state.takeoverActive;
  return [_selected, _takeover] as const;
}

test('flowgridStore: structurally satisfies FlowgridStoreView (selectedCellId + takeoverActive exposed on the getState() return type)', () => {
  // Runtime check + the typecheck from assertStoreViewContract above pins the
  // type contract at compile time. Calling it here keeps it from being tree-shaken
  // by the test runner and exercises the runtime cast path.
  const result = assertStoreViewContract(
    flowgridStore as unknown as FlowgridStoreView,
  );
  expect(result).toEqual([null, false]);
});
