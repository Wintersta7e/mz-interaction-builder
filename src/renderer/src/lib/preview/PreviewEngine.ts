import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
  ActionNodeData,
  ConditionNodeData,
  MenuNodeData,
  Condition,
  Action,
} from "../../types";
import type { PreviewState, TranscriptEntry } from "./types";
import { evaluateScript, executeScript } from "./scriptSandbox";

/** Detect test environment without depending on Node.js `process` types. */
function isTestEnvironment(): boolean {
  return (globalThis as Record<string, unknown>)["__vitest_worker__"] !== undefined;
}

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

    // Handle choice selection when waiting
    if (this._state.status === "waiting_choice" && choiceIndex !== undefined) {
      return this.selectChoice(choiceIndex);
    }

    // Guard: waiting_choice requires a choiceIndex
    if (this._state.status === "waiting_choice") {
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

    // Muted node bypass — skip processing and follow bypass edge.
    // Mirrors the export pipeline (lib/export/index.ts:680-697): try the
    // canonical handle first ("choice-0" / "true"), fall back to any outgoing
    // edge so muted nodes with non-canonical wiring still advance.
    if (node.data.muted && node.type !== "start") {
      this.addTranscript({
        nodeId: node.id,
        nodeType: node.type as "action" | "condition" | "menu" | "end",
        content: `[Muted] Skipped ${node.data.label}`,
      });

      const outEdges = this.edgesBySource.get(node.id) ?? [];
      let bypassEdge: InteractionEdge | undefined;
      if (node.type === "condition") {
        bypassEdge = outEdges.find((e) => e.sourceHandle === "true") ?? outEdges[0];
      } else if (node.type === "menu") {
        bypassEdge = outEdges.find((e) => e.sourceHandle === "choice-0") ?? outEdges[0];
      } else {
        bypassEdge = outEdges[0];
      }

      if (bypassEdge) {
        this._state.visitedEdges.add(bypassEdge.id);
        this._state.currentNodeId = bypassEdge.target;
      } else {
        this._state.status = "ended";
        this._state.currentNodeId = null;
      }

      return this._state;
    }

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
      case "condition":
        this.processConditionNode(node);
        break;
      case "menu":
        this.processMenuNode(node);
        break;
      default:
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

  /**
   * Scan ALL nodes in the document and collect referenced variable/switch IDs.
   * Returns sorted, deduplicated arrays.
   */
  getReferencedIds(): { variableIds: number[]; switchIds: number[] } {
    const varSet = new Set<number>();
    const switchSet = new Set<number>();

    const collectFromCondition = (condition: Condition): void => {
      if (condition.type === "variable" && condition.variableId !== undefined) {
        varSet.add(condition.variableId);
      }
      if (condition.type === "switch" && condition.switchId !== undefined) {
        switchSet.add(condition.switchId);
      }
    };

    for (const node of this.document.nodes) {
      switch (node.type) {
        case "action": {
          const data = node.data as ActionNodeData;
          for (const action of data.actions) {
            if (action.type === "set_variable" && action.variableId !== undefined) {
              varSet.add(action.variableId);
            }
            if (action.type === "set_switch" && action.switchId !== undefined) {
              switchSet.add(action.switchId);
            }
          }
          break;
        }
        case "condition": {
          const data = node.data as ConditionNodeData;
          if (data.condition) {
            collectFromCondition(data.condition);
          }
          break;
        }
        case "menu": {
          const data = node.data as MenuNodeData;
          for (const choice of data.choices) {
            if (choice.hideCondition) {
              collectFromCondition(choice.hideCondition);
            }
            if (choice.disableCondition) {
              collectFromCondition(choice.disableCondition);
            }
          }
          break;
        }
        default:
          break;
      }
    }

    return {
      variableIds: Array.from(varSet).sort((a, b) => a - b),
      switchIds: Array.from(switchSet).sort((a, b) => a - b),
    };
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
    const detailParts: string[] = [];
    let dialogueText: string | null = null;

    for (const action of data.actions ?? []) {
      const result = this.simulateAction(action);
      if (result) {
        summaryParts.push(result);
      }
      // Collect raw detail for secondary display
      if (action.type === "show_text" && action.text) {
        dialogueText = action.text;
      } else if (action.type === "script" && action.script) {
        detailParts.push(action.script);
      }
    }

    const content =
      summaryParts.length > 0 ? summaryParts.join("; ") : `Action "${node.data.label}"`;

    // detail: raw dialogue text for typewriter display, or script sources
    const detail = dialogueText ?? (detailParts.length > 0 ? detailParts.join("; ") : undefined);

    this.addTranscript({
      nodeId: node.id,
      nodeType: "action",
      content,
      detail,
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
        return `Show Text: "${text}"`;
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
        const scriptSrc = action.script ?? "";
        const err = executeScript(scriptSrc, this._state.variables, this._state.switches);
        if (err) {
          return `[Script Error: ${err.message}]`;
        }
        return `[Script] ${scriptSrc}`;
      }

      default:
        return "";
    }
  }

  /** Process a Condition node: evaluate condition, follow true/false branch */
  private processConditionNode(node: InteractionNode): void {
    const data = node.data as ConditionNodeData;
    const condition = data.condition;

    // Default to false if no condition defined
    if (!condition) {
      this.addTranscript({
        nodeId: node.id,
        nodeType: "condition",
        content: "Condition: (none)",
        result: "false",
      });
      this.followEdge(node.id, "false");
      return;
    }

    const evalResult = this.evaluateConditionValue(condition);
    const branch = evalResult ? "true" : "false";

    // Build human-readable content description
    let content: string;
    let detail: string | undefined;
    let result: "true" | "false" | "error" = branch;

    switch (condition.type) {
      case "switch":
        content = `Condition: Switch ${condition.switchId ?? 0} is ${condition.switchValue ?? "on"}`;
        break;
      case "variable":
        content = `Condition: Variable ${condition.variableId ?? 0} ${condition.variableOperator ?? "=="} ${condition.variableCompareValue ?? 0}`;
        break;
      case "script": {
        const scriptSrc = condition.script ?? "";
        const scriptResult = evaluateScript(scriptSrc, this._state.variables, this._state.switches);
        if (scriptResult instanceof Error) {
          result = "error";
          detail = scriptResult.message;
        } else {
          detail = scriptSrc;
        }
        content = `Condition: Script "${scriptSrc}"`;
        break;
      }
      default:
        content = "Condition: (unknown type)";
        break;
    }

    this.addTranscript({
      nodeId: node.id,
      nodeType: "condition",
      content,
      detail,
      result,
    });

    this.followEdge(node.id, branch);
  }

  /** Process a Menu node: evaluate choice conditions, build available choices, wait for selection */
  private processMenuNode(node: InteractionNode): void {
    const data = node.data as MenuNodeData;
    const choices = data.choices ?? [];

    const availableChoices: PreviewState["availableChoices"] = choices.map((choice, index) => {
      let hidden = false;
      let disabled = false;

      if (choice.hideCondition) {
        hidden = this.evaluateConditionValue(choice.hideCondition);
      }
      if (choice.disableCondition) {
        disabled = this.evaluateConditionValue(choice.disableCondition);
      }

      return { index, text: choice.text, hidden, disabled };
    });

    this._state.availableChoices = availableChoices;

    const visibleCount = availableChoices.filter((c) => !c.hidden).length;
    const hiddenCount = availableChoices.filter((c) => c.hidden).length;
    const hiddenNote = hiddenCount > 0 ? ` (${hiddenCount} hidden)` : "";

    this.addTranscript({
      nodeId: node.id,
      nodeType: "menu",
      content: `Menu: ${visibleCount} choices${hiddenNote}`,
    });

    this._state.status = "waiting_choice";
  }

  /**
   * Handle a choice selection when status is "waiting_choice".
   * choiceIndex is the original index matching the "choice-N" handle.
   */
  private selectChoice(choiceIndex: number): PreviewState {
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

    // Find the choice text for the transcript
    const data = node.data as MenuNodeData;
    const choiceText = data.choices[choiceIndex]?.text ?? `Choice ${choiceIndex}`;

    this._state.choiceHistory.push(choiceIndex);

    this.addTranscript({
      nodeId: node.id,
      nodeType: "menu",
      content: `Choice: '${choiceText}'`,
    });

    this._state.availableChoices = [];
    this._state.status = "running";

    this.followEdge(nodeId, `choice-${choiceIndex}`);

    return this._state;
  }

  /** Evaluate a condition and return true/false */
  private evaluateConditionValue(condition: Condition): boolean {
    switch (condition.type) {
      case "switch": {
        const switchVal = this._state.switches.get(condition.switchId ?? 0) ?? false;
        return switchVal === (condition.switchValue === "on");
      }

      case "variable": {
        const value = this._state.variables.get(condition.variableId ?? 0) ?? 0;
        const compareValue = condition.variableCompareValue ?? 0;
        const operator = condition.variableOperator ?? "==";

        switch (operator) {
          case "==":
            return value === compareValue;
          case "!=":
            return value !== compareValue;
          case ">":
            return value > compareValue;
          case "<":
            return value < compareValue;
          case ">=":
            return value >= compareValue;
          case "<=":
            return value <= compareValue;
          default:
            return false;
        }
      }

      case "script": {
        const result = evaluateScript(
          condition.script ?? "",
          this._state.variables,
          this._state.switches,
        );
        if (result instanceof Error) {
          return false;
        }
        return Boolean(result);
      }

      default:
        return false;
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
   * Logs to console.debug in development for DevTools inspection.
   */
  private addTranscript(partial: Omit<TranscriptEntry, "stepIndex">): void {
    this._state.stepCount += 1;
    const entry: TranscriptEntry = {
      ...partial,
      stepIndex: this._state.stepCount,
    };
    this._state.transcript.push(entry);
    if (this._state.transcript.length > 500) {
      this._state.transcript = this._state.transcript.slice(-500);
    }
    this._state.transcriptVersion += 1;

    if (!isTestEnvironment()) {
      console.debug(
        `[Preview] [${entry.stepIndex}] ${entry.content}`,
        entry.detail ? `| ${entry.detail}` : "",
        entry.result ? `→ ${entry.result}` : "",
      );
    }
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
      transcriptVersion: 0,
      visitedNodes: new Set(),
      visitedEdges: new Set(),
      choiceHistory: [],
      availableChoices: [],
      stepCount: 0,
    };
  }
}
