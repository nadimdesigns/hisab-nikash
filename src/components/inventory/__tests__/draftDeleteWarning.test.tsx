/**
 * Verifies that the "delete is blocked by an open draft cart" warning the
 * Inventory panel shows stays in sync with the `medishop-drafts-v1`
 * localStorage key — including when a *different* browser tab mutates that
 * key (which surfaces as a `storage` event in this tab).
 *
 * We test the listener mechanism in isolation rather than mounting the full
 * InventoryPanel: the panel pulls in the Zustand store, dialogs, etc., none
 * of which are relevant to the cross-tab sync behavior under test.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  DRAFTS_KEY,
  findDraftReferences,
  saveDraft,
  type DraftReference,
} from "@/lib/drafts";
import { useDraftsListener } from "@/hooks/use-drafts-listener";

const PRODUCT_ID = "prod-1";

// Mirrors the InventoryPanel logic: keep `draftRefs` in sync with the drafts
// key and render a warning whenever any open cart references the product.
function DeleteWarningProbe({ productId }: { productId: string }) {
  const [refs, setRefs] = useState<DraftReference[]>(() =>
    findDraftReferences(productId),
  );
  useDraftsListener(() => {
    setRefs(findDraftReferences(productId));
  });
  if (refs.length === 0) {
    return <p data-testid="status">safe-to-delete</p>;
  }
  return (
    <div>
      <p data-testid="status">blocked</p>
      <ul>
        {refs.map((r, i) => (
          <li key={i} data-testid="ref">
            {r.kind}:{r.customer}:{r.qty}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Simulate a *cross-tab* drafts mutation. Real browsers dispatch a `storage`
 * event in every tab except the one that wrote the value; jsdom does not, so
 * we write the new value with `localStorage.setItem` (no same-tab event) and
 * then dispatch the `storage` event ourselves to model the other tab's
 * notification arriving here.
 */
function simulateOtherTabWrite(value: unknown) {
  const oldValue = window.localStorage.getItem(DRAFTS_KEY);
  const newValue = JSON.stringify(value);
  window.localStorage.setItem(DRAFTS_KEY, newValue);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: DRAFTS_KEY,
      oldValue,
      newValue,
      storageArea: window.localStorage,
    }),
  );
}

describe("Inventory delete warning ⇄ cross-tab drafts sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Hook debounce is 120ms by default — fake timers let us advance past it
    // deterministically without `await new Promise(...setTimeout)` waits.
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("starts in safe-to-delete when no draft references the product", () => {
    render(<DeleteWarningProbe productId={PRODUCT_ID} />);
    expect(screen.getByTestId("status")).toHaveTextContent("safe-to-delete");
  });

  it("reflects an existing draft on initial mount", () => {
    saveDraft("cash", {
      customer: "রহিম উদ্দিন",
      items: [
        { productId: PRODUCT_ID, name: "মসুর ডাল", qty: 2, unitPrice: 10, unitCost: 5 },
      ],
    });
    render(<DeleteWarningProbe productId={PRODUCT_ID} />);
    expect(screen.getByTestId("status")).toHaveTextContent("blocked");
    expect(screen.getByTestId("ref")).toHaveTextContent("cash:রহিম উদ্দিন:2");
  });

  it("transitions to blocked when another tab adds the product to a cart", () => {
    render(<DeleteWarningProbe productId={PRODUCT_ID} />);
    expect(screen.getByTestId("status")).toHaveTextContent("safe-to-delete");

    act(() => {
      simulateOtherTabWrite({
        cash: {
          kind: "cash",
          customer: "করিম হোসেন",
          items: [
            { productId: PRODUCT_ID, name: "মসুর ডাল", qty: 3, unitPrice: 10, unitCost: 5 },
          ],
          updatedAt: new Date().toISOString(),
        },
      });
      // Advance past the listener debounce window.
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("blocked");
    expect(screen.getByTestId("ref")).toHaveTextContent("cash:করিম হোসেন:3");
  });

  it("transitions back to safe-to-delete when the other tab removes the item", () => {
    saveDraft("due", {
      customer: "আয়েশা সিদ্দিকা",
      items: [
        { productId: PRODUCT_ID, name: "মসুর ডাল", qty: 1, unitPrice: 10, unitCost: 5 },
      ],
    });
    render(<DeleteWarningProbe productId={PRODUCT_ID} />);
    expect(screen.getByTestId("status")).toHaveTextContent("blocked");

    act(() => {
      // Other tab cleared its draft entirely.
      simulateOtherTabWrite({});
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("safe-to-delete");
  });

  it("debounces a rapid burst of cross-tab writes into a single recompute", () => {
    const renderSpy = vi.fn();
    function SpyProbe() {
      const [refs, setRefs] = useState<DraftReference[]>(() =>
        findDraftReferences(PRODUCT_ID),
      );
      useDraftsListener(() => {
        setRefs(findDraftReferences(PRODUCT_ID));
      });
      renderSpy(refs.length);
      return <p data-testid="status">{refs.length === 0 ? "safe" : "blocked"}</p>;
    }
    render(<SpyProbe />);
    const initialRenders = renderSpy.mock.calls.length;

    act(() => {
      // Five rapid writes (e.g. another tab quickly bumping qty 1→5).
      for (let qty = 1; qty <= 5; qty++) {
        simulateOtherTabWrite({
          cash: {
            kind: "cash",
            customer: "Dave",
            items: [
              { productId: PRODUCT_ID, name: "মসুর ডাল", qty, unitPrice: 10, unitCost: 5 },
            ],
            updatedAt: new Date().toISOString(),
          },
        });
      }
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("blocked");
    // Only one extra render past the initial mount — proves the debounce
    // collapsed five storage events into a single state update.
    expect(renderSpy.mock.calls.length - initialRenders).toBe(1);
  });

  it("ignores draft mutations for unrelated products", () => {
    render(<DeleteWarningProbe productId={PRODUCT_ID} />);
    act(() => {
      simulateOtherTabWrite({
        cash: {
          kind: "cash",
          customer: "Eve",
          items: [
            { productId: "other-med", name: "চিনি", qty: 4, unitPrice: 10, unitCost: 5 },
          ],
          updatedAt: new Date().toISOString(),
        },
      });
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId("status")).toHaveTextContent("safe-to-delete");
  });
});
