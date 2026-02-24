import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
  ActionNodeData,
  Action,
} from "../../types";
import type { PreviewState, TranscriptEntry } from "./types";

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
   */
  step(choiceIndex?: number): PreviewState {
    // Guard: no-op if ended
    if (this._state.status === "ended") {
      return this._state;
    }

    // Guard: waiting_choice requires a choiceIndex
    if (
      this._state.status === "waiting_choice" &&
      choiceIndex === undefined
    ) {
      return this._state;
    }

    const nodeId = this._state.currentNodeId;
    if (!nodeId) {
      this._state.status = "ended";
      return this._state;
    }

    const node = this.nodeMap.get(nodeId);
    if (!node) {
      this._state.status = "ended";
      return this._state;
    }

    // Mark current node as visited before processing
    this._state.visitedNodes.add(nodeId);

    // Dispatch by node type
    switch (node.type) {
      case "start":
        this.processStartNode(node);
        break;
      case "end":
        this.processEndNode(node);
        break;
      case "action":
        this.processActionNode(node);
        break;
      default:
        // Menu and Condition handled in later tasks
        break;
    }

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

  /** Process a Start node: log to transcript and follow the default edge */
  private processStartNode(node: InteractionNode): void {
    const label = node.data.label || "Start";
    this.addTranscript({
      nodeId: node.id,
      nodeType: "start",
      content: `Start → "${label}"`,
    });
    this.followEdge(node.id);
  }

  /** Process an End node: log to transcript and set status to ended */
  private processEndNode(node: InteractionNode): void {
    this.addTranscript({
      nodeId: node.id,
      nodeType: "end",
      content: "End of Interaction",
    });
    this._state.status = "ended";
    this._state.currentNodeId = null;
  }

  /** Process an Action node: execute all actions, log summary, follow edge */
  private processActionNode(node: InteractionNode): void {
    const data = node.data as ActionNodeData;
    const summaryParts: string[] = [];

    for (const action of data.actions) {
      const result = this.simulateAction(action);
      if (result) {
        summaryParts.push(result);
      }
    }

    const content =
      summaryParts.length > 0
        ? summaryParts.join("; ")
        : `Action "${node.data.label}"`;

    this.addTranscript({
      nodeId: node.id,
      nodeType: "action",
      content,
    });

    this.followEdge(node.id);
  }

  /**
   * Simulate a single action and return a description string.
   * Side-effects: mutates state.variables and state.switches.
   */
  private simulateAction(action: Action): string {
    switch (action.type) {
      case "set_variable": {
        const id = action.variableId ?? 0;
        const current = this._state.variables.get(id) ?? 0;
        const operand =
          typeof action.variableValue === "number"
            ? action.variableValue
            : Number(action.variableValue ?? 0);
        let result: number;

        switch (action.variableOperation) {
          case "set":
            result = operand;
            break;
          case "add":
            result = current + operand;
            break;
          case "sub":
            result = current - operand;
            break;
          case "mul":
            result = current * operand;
            break;
          case "div":
            result = operand !== 0 ? Math.trunc(current / operand) : 0;
            break;
          case "mod":
            result = operand !== 0 ? current % operand : 0;
            break;
          default:
            result = operand;
            break;
        }

        this._state.variables.set(id, result);
        return `Var[${id}] ${action.variableOperation ?? "set"} ${operand} → ${result}`;
      }

      case "set_switch": {
        const id = action.switchId ?? 0;
        let value: boolean;

        switch (action.switchValue) {
          case "on":
            value = true;
            break;
          case "off":
            value = false;
            break;
          case "toggle":
            value = !(this._state.switches.get(id) ?? false);
            break;
          default:
            value = true;
            break;
        }

        this._state.switches.set(id, value);
        return `Switch[${id}] = ${value ? "ON" : "OFF"}`;
      }

      case "show_text": {
        const text = action.text ?? "";
        return text;
      }

      case "common_event": {
        const eventId = action.commonEventId ?? 0;
        return `[Common Event #${eventId}]`;
      }

      case "plugin_command": {
        const pluginName = action.pluginName ?? "Unknown";
        const commandName = action.commandName ?? "Unknown";
        return `[Plugin: ${pluginName}.${commandName}]`;
      }

      case "script": {
        return "[Script]";
      }

      default:
        return "";
    }
  }

  /**
   * Follow an outgoing edge from the given node.
   * If sourceHandle is provided, match on edge.sourceHandle.
   * Otherwise take the first available edge.
   * Records the edge in visitedEdges and advances currentNodeId.
   * If no edge is found, sets status to "ended".
   */
  private followEdge(nodeId: string, sourceHandle?: string): void {
    const edges = this.edgesBySource.get(nodeId);
    if (!edges || edges.length === 0) {
      this._state.status = "ended";
      this._state.currentNodeId = null;
      return;
    }

    let edge: InteractionEdge | undefined;
    if (sourceHandle) {
      edge = edges.find((e) => e.sourceHandle === sourceHandle);
    } else {
      edge = edges[0];
    }

    if (!edge) {
      this._state.status = "ended";
      this._state.currentNodeId = null;
      return;
    }

    this._state.visitedEdges.add(edge.id);
    this._state.currentNodeId = edge.target;
  }

  /**
   * Add a transcript entry with auto-incremented stepCount as stepIndex.
   */
  private addTranscript(
    partial: Omit<TranscriptEntry, "stepIndex">,
  ): void {
    this._state.stepCount += 1;
    this._state.transcript.push({
      ...partial,
      stepIndex: this._state.stepCount,
    });
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
