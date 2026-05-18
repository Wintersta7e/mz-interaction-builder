import { create } from "zustand";
import { PreviewEngine } from "../lib/preview/PreviewEngine";
import type { PreviewState } from "../lib/preview/types";
import { useDocumentStore } from "./index";

/** Deep-clone a PreviewState so the store holds an independent snapshot.
 *  The engine mutates its Maps/Sets/arrays in place, so a shallow spread
 *  would share references and break React change detection (BUG-5).
 *
 *  Optimization: reuse the previous transcript snapshot when no new entries
 *  were added this step. Autoplay can call this 2×/sec with a 500-entry
 *  transcript — skipping the clone avoids continuous GC churn and prevents
 *  ExecutionLog from re-rendering on every step regardless of growth. */
function clonePreviewState(state: PreviewState, previous: PreviewState | null): PreviewState {
  const transcript =
    previous && previous.transcriptVersion === state.transcriptVersion
      ? previous.transcript
      : [...state.transcript];
  return {
    ...state,
    variables: new Map(state.variables),
    switches: new Map(state.switches),
    visitedNodes: new Set(state.visitedNodes),
    visitedEdges: new Set(state.visitedEdges),
    transcript,
    choiceHistory: [...state.choiceHistory],
    availableChoices: state.availableChoices.map((c) => ({ ...c })),
  };
}

interface CoverageData {
  visitedNodes: Set<string>;
  visitedEdges: Set<string>;
}

interface PreviewStoreState {
  isOpen: boolean;
  engine: PreviewEngine | null;
  previewState: PreviewState | null;
  autoPlay: boolean;
  autoPlaySpeed: number;
  coverageData: CoverageData;
  focusNodeId: string | null;

  open: (startNodeId?: string) => void;
  close: () => void;
  step: (choiceIndex?: number) => void;
  restart: (startNodeId?: string) => void;
  setVariable: (id: number, value: number) => void;
  setSwitch: (id: number, value: boolean) => void;
  toggleAutoPlay: () => void;
  setAutoPlaySpeed: (ms: number) => void;
  clearCoverage: () => void;
  setFocusNodeId: (id: string | null) => void;
}

export const usePreviewStore = create<PreviewStoreState>()((set, get) => ({
  isOpen: false,
  engine: null,
  previewState: null,
  autoPlay: false,
  autoPlaySpeed: 1000,
  coverageData: { visitedNodes: new Set(), visitedEdges: new Set() },
  focusNodeId: null,

  open: (startNodeId?: string) => {
    const doc = useDocumentStore.getState().document;
    const engine = new PreviewEngine(doc, startNodeId);
    set({
      isOpen: true,
      engine,
      previewState: clonePreviewState(engine.state, null),
      autoPlay: false,
    });
  },

  close: () => {
    // Reset coverage when closing — otherwise stale node IDs from a prior
    // document linger across reopen and DOM highlight passes iterate over them
    // for no reason.
    set({
      isOpen: false,
      engine: null,
      previewState: null,
      autoPlay: false,
      coverageData: { visitedNodes: new Set(), visitedEdges: new Set() },
    });
  },

  step: (choiceIndex?: number) => {
    const { engine, coverageData, previewState } = get();
    if (!engine) return;

    engine.step(choiceIndex);

    // Merge engine's visited sets into cumulative coverage
    const newVisitedNodes = new Set(coverageData.visitedNodes);
    for (const id of engine.state.visitedNodes) {
      newVisitedNodes.add(id);
    }
    const newVisitedEdges = new Set(coverageData.visitedEdges);
    for (const id of engine.state.visitedEdges) {
      newVisitedEdges.add(id);
    }

    set({
      previewState: clonePreviewState(engine.state, previewState),
      coverageData: {
        visitedNodes: newVisitedNodes,
        visitedEdges: newVisitedEdges,
      },
    });
  },

  restart: (startNodeId?: string) => {
    const { engine } = get();
    if (!engine) return;

    engine.reset(startNodeId);
    set({
      previewState: clonePreviewState(engine.state, null),
      autoPlay: false,
    });
  },

  setVariable: (id: number, value: number) => {
    const { engine, previewState } = get();
    if (!engine) return;

    engine.setVariable(id, value);
    set({ previewState: clonePreviewState(engine.state, previewState) });
  },

  setSwitch: (id: number, value: boolean) => {
    const { engine, previewState } = get();
    if (!engine) return;

    engine.setSwitch(id, value);
    set({ previewState: clonePreviewState(engine.state, previewState) });
  },

  toggleAutoPlay: () => {
    set((state) => ({ autoPlay: !state.autoPlay }));
  },

  setAutoPlaySpeed: (ms: number) => {
    set({ autoPlaySpeed: ms });
  },

  clearCoverage: () => {
    set({
      coverageData: { visitedNodes: new Set(), visitedEdges: new Set() },
    });
  },

  setFocusNodeId: (id) => set({ focusNodeId: id }),
}));
