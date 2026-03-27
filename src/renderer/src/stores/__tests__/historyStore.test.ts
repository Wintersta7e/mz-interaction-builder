import { describe, it, expect, beforeEach } from "vitest";
import { useDocumentStore, useHistoryStore } from "../index";
import type { InteractionDocument } from "../../types";

function makeDoc(name: string): InteractionDocument {
  return {
    version: "1.0.0",
    name,
    description: "",
    nodes: [],
    edges: [],
    variables: [],
    bookmarks: [],
  };
}

function resetStores(): void {
  useDocumentStore.setState({ document: makeDoc("Initial"), savedPath: null, isDirty: false });
  useHistoryStore.getState().clear();
}

describe("HistoryStore — undo/redo", () => {
  beforeEach(resetStores);

  it("starts with empty history", () => {
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  it("push adds to past and clears future", () => {
    useHistoryStore.getState().push(makeDoc("V1"));
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  it("undo returns previous document", () => {
    // Push V1 as the snapshot before a change
    useHistoryStore.getState().push(makeDoc("V1"));
    // Current doc is now "Initial" in the document store
    useDocumentStore.setState({ document: makeDoc("V2") });

    const restored = useHistoryStore.getState().undo();
    expect(restored).not.toBeNull();
    expect(restored!.name).toBe("V1");
    expect(useHistoryStore.getState().canRedo()).toBe(true);
  });

  it("redo returns next document", () => {
    useHistoryStore.getState().push(makeDoc("V1"));
    useDocumentStore.setState({ document: makeDoc("V2") });

    // Undo: restores V1, pushes V2 to future
    useHistoryStore.getState().undo();
    useDocumentStore.setState({ document: makeDoc("V1") });

    // Redo: restores V2
    const redone = useHistoryStore.getState().redo();
    expect(redone).not.toBeNull();
    expect(redone!.name).toBe("V2");
  });

  it("undo returns null when nothing to undo", () => {
    const result = useHistoryStore.getState().undo();
    expect(result).toBeNull();
  });

  it("redo returns null when nothing to redo", () => {
    const result = useHistoryStore.getState().redo();
    expect(result).toBeNull();
  });

  it("push after undo clears the redo future", () => {
    useHistoryStore.getState().push(makeDoc("V1"));
    useDocumentStore.setState({ document: makeDoc("V2") });

    useHistoryStore.getState().undo();
    useDocumentStore.setState({ document: makeDoc("V1") });

    expect(useHistoryStore.getState().canRedo()).toBe(true);

    // New push clears future
    useHistoryStore.getState().push(makeDoc("V3"));
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  it("limits history to 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      useHistoryStore.getState().push(makeDoc(`V${i}`));
    }
    expect(useHistoryStore.getState().past.length).toBeLessThanOrEqual(20);
  });

  it("clear resets all history", () => {
    useHistoryStore.getState().push(makeDoc("V1"));
    useHistoryStore.getState().push(makeDoc("V2"));
    useDocumentStore.setState({ document: makeDoc("V3") });
    useHistoryStore.getState().undo();

    useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  it("multiple undo/redo cycle works correctly", () => {
    // Build history: V1 → V2 → V3
    useHistoryStore.getState().push(makeDoc("V1"));
    useDocumentStore.setState({ document: makeDoc("V2") });
    useHistoryStore.getState().push(makeDoc("V2"));
    useDocumentStore.setState({ document: makeDoc("V3") });

    // Undo twice: V3 → V2 → V1
    const r1 = useHistoryStore.getState().undo();
    useDocumentStore.setState({ document: r1! });
    expect(r1!.name).toBe("V2");

    const r2 = useHistoryStore.getState().undo();
    useDocumentStore.setState({ document: r2! });
    expect(r2!.name).toBe("V1");

    // Redo twice: V1 → V2 → V3
    const r3 = useHistoryStore.getState().redo();
    useDocumentStore.setState({ document: r3! });
    expect(r3!.name).toBe("V2");

    const r4 = useHistoryStore.getState().redo();
    expect(r4!.name).toBe("V3");
  });
});
