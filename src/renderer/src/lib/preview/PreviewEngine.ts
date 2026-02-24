import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
} from "../../types";
import type { PreviewState } from "./types";

/**
 * PreviewEngine — pure TypeScript class that walks an interaction graph
 * to simulate dialogue playback. No React dependencies.
 *
 * Usage:
 *   const engine = new PreviewEngine(document);
 *   engine.step();           // advance one node
 *   engine.step(choiceIndex) // pick a menu choice
 *   engine.reset();          // start over
 */
export class PreviewEngine {
  private readonly document: InteractionDocument;
  private readonly nodeMap: Map<string, InteractionNode>;
  private readonly edgesBySource: Map<string, InteractionEdge[]>;
  private _state: PreviewState;

  constructor(document: InteractionDocument, startNodeId?: string) {
    this.document = document;
    this.nodeMap = new Map();
    this.edgesBySource = new Map();

    // Build lookup maps
    for (const node of document.nodes) {
      this.nodeMap.set(node.id, node);
    }
    for (const edge of document.edges) {
      const existing = this.edgesBySource.get(edge.source);
      if (existing) {
        existing.push(edge);
      } else {
        this.edgesBySource.set(edge.source, [edge]);
      }
    }

    this._state = this.createInitialState(startNodeId);
  }

  /** Read-only access to the current preview state */
  get state(): PreviewState {
    return this._state;
  }

  /** Reset the engine to initial state, optionally with a different start node */
  reset(startNodeId?: string): PreviewState {
    this._state = this.createInitialState(startNodeId);
    return this._state;
  }

  /**
   * Advance the engine by one step.
   * For menu nodes, pass the choiceIndex the player selected.
   * STUB — returns current state unchanged (implemented in Task 2).
   */
  step(_choiceIndex?: number): PreviewState {
    return this._state;
  }

  /** Set a game variable value */
  setVariable(id: number, value: number): void {
    this._state.variables.set(id, value);
  }

  /** Set a game switch value */
  setSwitch(id: number, value: boolean): void {
    this._state.switches.set(id, value);
  }

  /**
   * Create initial preview state.
   * If startNodeId is provided, uses that node.
   * Otherwise finds the first node with type === "start".
   * If no valid start is found, sets status to "ended".
   */
  private createInitialState(startNodeId?: string): PreviewState {
    let currentNodeId: string | null = null;

    if (startNodeId && this.nodeMap.has(startNodeId)) {
      currentNodeId = startNodeId;
    } else {
      // Find the first start node
      for (const node of this.document.nodes) {
        if (node.type === "start") {
          currentNodeId = node.id;
          break;
        }
      }
    }

    return {
      currentNodeId,
      status: currentNodeId ? "running" : "ended",
      variables: new Map(),
      switches: new Map(),
      transcript: [],
      visitedNodes: new Set(),
      visitedEdges: new Set(),
      choiceHistory: [],
      availableChoices: [],
      stepCount: 0,
    };
  }
}
