import { create } from "zustand";
import { PreviewEngine } from "../lib/preview/PreviewEngine";
import type { PreviewState } from "../lib/preview/types";
import { useDocumentStore } from "./index";

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

  open: (startNodeId?: string) => void;
  close: () => void;
  step: (choiceIndex?: number) => void;
  restart: (startNodeId?: string) => void;
  setVariable: (id: number, value: number) => void;
  setSwitch: (id: number, value: boolean) => void;
  toggleAutoPlay: () => void;
  setAutoPlaySpeed: (ms: number) => void;
  clearCoverage: () => void;
}

export const usePreviewStore = create<PreviewStoreState>()((set, get) => ({
  isOpen: false,
  engine: null,
  previewState: null,
  autoPlay: false,
  autoPlaySpeed: 1000,
  coverageData: { visitedNodes: new Set(), visitedEdges: new Set() },

  open: (startNodeId?: string) => {
    const doc = useDocumentStore.getState().document;
    const engine = new PreviewEngine(doc, startNodeId);
    set({
      isOpen: true,
      engine,
      previewState: { ...engine.state },
      autoPlay: false,
    });
  },

  close: () => {
    set({
      isOpen: false,
      engine: null,
      previewState: null,
      autoPlay: false,
    });
  },

  step: (choiceIndex?: number) => {
    const { engine, coverageData } = get();
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
      previewState: { ...engine.state },
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
      previewState: { ...engine.state },
      autoPlay: false,
    });
  },

  setVariable: (id: number, value: number) => {
    const { engine } = get();
    if (!engine) return;

    engine.setVariable(id, value);
    set({ previewState: { ...engine.state } });
  },

  setSwitch: (id: number, value: boolean) => {
    const { engine } = get();
    if (!engine) return;

    engine.setSwitch(id, value);
    set({ previewState: { ...engine.state } });
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
}));
