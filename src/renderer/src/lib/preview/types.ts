import type { InteractionNodeType } from "../../types";

/** Current status of the preview engine */
export type PreviewStatus = "running" | "waiting_choice" | "ended";

/** A single entry in the preview transcript */
export interface TranscriptEntry {
  stepIndex: number;
  nodeId: string;
  nodeType: InteractionNodeType;
  content: string;
  detail?: string;
  result?: "true" | "false" | "error";
}

/** A choice available to the player during menu preview */
export interface AvailableChoice {
  index: number;
  text: string;
  disabled: boolean;
  hidden: boolean;
}

/** Full state snapshot of the preview engine */
export interface PreviewState {
  currentNodeId: string | null;
  status: PreviewStatus;
  variables: Map<number, number>;
  switches: Map<number, boolean>;
  transcript: TranscriptEntry[];
  /** Bumped by the engine whenever `transcript` is mutated. Lets callers
   *  cheaply detect transcript-only changes without comparing entries. */
  transcriptVersion: number;
  visitedNodes: Set<string>;
  visitedEdges: Set<string>;
  choiceHistory: number[];
  availableChoices: AvailableChoice[];
  stepCount: number;
}
