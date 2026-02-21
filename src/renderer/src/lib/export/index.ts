import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
  MenuNodeData,
  ActionNodeData,
  ConditionNodeData,
  Condition,
  MenuChoice,
} from "../../types";

interface MZCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

// Event codes reference
const EVENT_CODES = {
  END: 0,
  SHOW_TEXT: 101,
  TEXT_LINE: 401,
  SHOW_CHOICES: 102,
  CHOICE_BRANCH: 402,
  CHOICE_CANCEL: 403,
  CHOICE_END: 404,
  CONDITIONAL_BRANCH: 111,
  CONDITIONAL_ELSE: 411,
  CONDITIONAL_END: 412,
  LABEL: 118,
  JUMP_TO_LABEL: 119,
  COMMON_EVENT: 117,
  CONTROL_SWITCHES: 121,
  CONTROL_VARIABLES: 122,
  SCRIPT: 355,
  SCRIPT_LINE: 655,
  WAIT: 230,
  PLUGIN_COMMAND: 357,
};

// Variable used as temporary storage for dynamic menu choice routing.
// If your project already uses this variable, change the value here.
const TEMP_CHOICE_VAR = 99;

// Helper to generate condition evaluation script
function generateConditionScript(condition: Condition): string {
  switch (condition.type) {
    case "switch": {
      const switchVal = condition.switchValue === "on" ? "true" : "false";
      return `$gameSwitches.value(${condition.switchId || 0}) === ${switchVal}`;
    }
    case "variable": {
      const op = condition.variableOperator || "==";
      const val = condition.variableCompareValue || 0;
      return `$gameVariables.value(${condition.variableId || 0}) ${op} ${val}`;
    }
    case "script":
      return condition.script || "true";
    default:
      return "true";
  }
}

// Map menu cancel-type setting to the numeric value RPG Maker expects.
function mapCancelType(
  cancelType: MenuNodeData["cancelType"],
  choiceCount: number,
): number {
  switch (cancelType) {
    case "disallow":
      return -1;
    case "branch":
      return -2;
    case "last_choice":
      return choiceCount - 1;
    default:
      return -1;
  }
}

export function exportToMZCommands(document: InteractionDocument): MZCommand[] {
  const commands: MZCommand[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(document.nodes.map((n) => [n.id, n]));
  const edgesBySource = new Map<string, InteractionEdge[]>();
  const edgesByTarget = new Map<string, InteractionEdge[]>();

  // Group edges by source and target
  for (const edge of document.edges) {
    const existingBySource = edgesBySource.get(edge.source) || [];
    existingBySource.push(edge);
    edgesBySource.set(edge.source, existingBySource);

    const existingByTarget = edgesByTarget.get(edge.target) || [];
    existingByTarget.push(edge);
    edgesByTarget.set(edge.target, existingByTarget);
  }

  // Pre-analyze: find nodes with multiple incoming edges (convergence nodes)
  // These need special handling - labels must be placed outside branch structures
  const convergenceNodes = new Set<string>();
  for (const [nodeId, edges] of edgesByTarget) {
    if (edges.length > 1) {
      convergenceNodes.add(nodeId);
    }
  }

  // Find start node
  const startNode = document.nodes.find((n) => n.type === "start");
  if (!startNode) {
    console.warn("No start node found");
    return commands;
  }

  // Track nodes that need labels (visited more than once or are convergence points)
  const needsLabel = new Set<string>();

  // Process nodes using DFS with proper indentation tracking
  function processNode(nodeId: string, indent: number): void {
    // If this is a convergence node and we're inside a branch (indent > 0),
    // don't process it inline - just jump to it
    if (convergenceNodes.has(nodeId) && indent > 0 && visited.has(nodeId)) {
      commands.push({
        code: EVENT_CODES.JUMP_TO_LABEL,
        indent,
        parameters: [`node_${nodeId}`],
      });
      return;
    }

    if (visited.has(nodeId)) {
      // Create jump to label for loops/convergence
      needsLabel.add(nodeId);
      commands.push({
        code: EVENT_CODES.JUMP_TO_LABEL,
        indent,
        parameters: [`node_${nodeId}`],
      });
      return;
    }

    const node = nodeMap.get(nodeId);
    if (!node) return;

    visited.add(nodeId);

    // Add label for this node if it's a convergence point or will need one
    if (convergenceNodes.has(nodeId)) {
      needsLabel.add(nodeId);
      commands.push({
        code: EVENT_CODES.LABEL,
        indent,
        parameters: [`node_${nodeId}`],
      });
    }

    // Muted node bypass: skip command generation, follow default outgoing edge
    if (node.data.muted && node.type !== "start") {
      const outEdges = edgesBySource.get(nodeId) || [];
      let bypassTarget: string | null = null;

      if (node.type === "condition") {
        // Follow true branch
        const trueEdge = outEdges.find((e) => e.sourceHandle === "true");
        bypassTarget = (trueEdge || outEdges[0])?.target ?? null;
      } else if (node.type === "menu") {
        // Follow first choice
        const choiceEdge = outEdges.find((e) => e.sourceHandle === "choice-0");
        bypassTarget = (choiceEdge || outEdges[0])?.target ?? null;
      } else {
        // Action, End: follow first outgoing edge
        bypassTarget = outEdges[0]?.target ?? null;
      }

      if (bypassTarget) {
        processNode(bypassTarget, indent);
      }
      return;
    }

    // Generate commands based on node type
    switch (node.type) {
      case "start":
        // Start node just continues to next
        break;

      case "menu":
        generateMenuCommands(node, indent);
        return; // Menu handles its own continuation

      case "action":
        generateActionCommands(node, indent);
        break;

      case "condition":
        generateConditionCommands(node, indent);
        return; // Condition handles its own continuation

      case "end":
        // End node - no commands needed, just stops
        return;

      case "group":
      case "comment":
        // Visual-only nodes — not exported
        return;
    }

    // Process next connected node
    const outEdges = edgesBySource.get(nodeId) || [];
    if (outEdges.length > 0) {
      const nextNodeId = outEdges[0].target;
      processNode(nextNodeId, indent);
    }
  }

  // Emit inline processing or a jump-to-label depending on whether the
  // target is a convergence node that has already been visited.
  function emitNodeOrJump(targetId: string, indent: number): void {
    if (convergenceNodes.has(targetId) && visited.has(targetId)) {
      needsLabel.add(targetId);
      commands.push({
        code: EVENT_CODES.JUMP_TO_LABEL,
        indent,
        parameters: [`node_${targetId}`],
      });
    } else {
      processNode(targetId, indent);
    }
  }

  // Helper to generate menu commands
  function generateMenuCommands(node: InteractionNode, indent: number): void {
    const data = node.data as MenuNodeData;
    const choices = data.choices || [];
    const outEdges = edgesBySource.get(node.id) || [];

    // Map choice indices to target nodes
    const choiceTargets: (string | null)[] = choices.map(() => null);
    for (const edge of outEdges) {
      if (edge.sourceHandle?.startsWith("choice-")) {
        const idx = parseInt(edge.sourceHandle.replace("choice-", ""), 10);
        if (!isNaN(idx) && idx < choiceTargets.length) {
          choiceTargets[idx] = edge.target;
        }
      }
    }

    // Check if any choices have hide/disable conditions
    const hasConditions = choices.some(
      (c) => c.hideCondition || c.disableCondition,
    );

    if (hasConditions) {
      // Use script-based dynamic choice menu
      generateDynamicMenuCommands(indent, choices, choiceTargets, data);
    } else {
      // Use standard Show Choices command
      generateStaticMenuCommands(indent, choices, choiceTargets, data);
    }
  }

  // Static menu (no conditions) - uses standard Show Choices
  function generateStaticMenuCommands(
    indent: number,
    choices: MenuChoice[],
    choiceTargets: (string | null)[],
    data: MenuNodeData,
  ): void {
    const cancelType = mapCancelType(data.cancelType, choices.length);

    // Show Choices command
    commands.push({
      code: EVENT_CODES.SHOW_CHOICES,
      indent,
      parameters: [
        choices.map((c) => c.text),
        cancelType,
        0, // Default choice
        data.windowPosition ?? 2,
        data.windowBackground ?? 0,
      ],
    });

    // Process each choice branch
    choices.forEach((choice, index) => {
      // Choice branch start
      commands.push({
        code: EVENT_CODES.CHOICE_BRANCH,
        indent,
        parameters: [index, choice.text],
      });

      // Process target node for this choice
      const targetId = choiceTargets[index];
      if (targetId) {
        emitNodeOrJump(targetId, indent + 1);
      }

      // End of choice content
      commands.push({
        code: EVENT_CODES.END,
        indent: indent + 1,
        parameters: [],
      });
    });

    // End choices
    commands.push({ code: EVENT_CODES.CHOICE_END, indent, parameters: [] });
  }

  // Dynamic menu (with conditions) - uses script to build choice array
  function generateDynamicMenuCommands(
    indent: number,
    choices: MenuChoice[],
    choiceTargets: (string | null)[],
    data: MenuNodeData,
  ): void {
    // Generate script to build dynamic choices array
    // Format: _mzib_choices = []; _mzib_map = [];
    // For each choice, conditionally push to array if not hidden
    // Apply disabled styling if needed

    const initLines: string[] = ["const _mzib_c = [];", "const _mzib_m = [];"];

    choices.forEach((choice, index) => {
      const choiceText = choice.text.replace(/'/g, "\\'");

      if (choice.hideCondition) {
        // Only add if hide condition is FALSE
        const hideScript = generateConditionScript(choice.hideCondition);
        initLines.push(`if (!(${hideScript})) {`);

        if (choice.disableCondition) {
          // Apply gray color if disabled
          const disableScript = generateConditionScript(
            choice.disableCondition,
          );
          initLines.push(
            `  const _t = (${disableScript}) ? '\\\\C[8]${choiceText}\\\\C[0]' : '${choiceText}';`,
          );
          initLines.push(`  _mzib_c.push(_t); _mzib_m.push(${index});`);
        } else {
          initLines.push(
            `  _mzib_c.push('${choiceText}'); _mzib_m.push(${index});`,
          );
        }

        initLines.push("}");
      } else if (choice.disableCondition) {
        // Always visible but conditionally disabled
        const disableScript = generateConditionScript(choice.disableCondition);
        initLines.push(`{`);
        initLines.push(
          `  const _t = (${disableScript}) ? '\\\\C[8]${choiceText}\\\\C[0]' : '${choiceText}';`,
        );
        initLines.push(`  _mzib_c.push(_t); _mzib_m.push(${index});`);
        initLines.push(`}`);
      } else {
        // No conditions - always add
        initLines.push(
          `_mzib_c.push('${choiceText}'); _mzib_m.push(${index});`,
        );
      }
    });

    // Determine cancel behavior
    let cancelScript = "-1";
    switch (data.cancelType) {
      case "disallow":
        cancelScript = "-1";
        break;
      case "branch":
        cancelScript = "-2";
        break;
      case "last_choice":
        cancelScript = "_mzib_c.length - 1";
        break;
    }

    // Add the script to set up choices
    initLines.push(`$gameMessage.setChoices(_mzib_c, 0, ${cancelScript});`);
    initLines.push(
      `$gameMessage.setChoiceBackground(${data.windowBackground ?? 0});`,
    );
    initLines.push(
      `$gameMessage.setChoicePositionType(${data.windowPosition ?? 2});`,
    );
    initLines.push(
      `$gameMessage.setChoiceCallback(n => { $gameVariables.setValue(${TEMP_CHOICE_VAR}, _mzib_m[n] ?? -1); });`,
    );

    // Push the script command
    commands.push({
      code: EVENT_CODES.SCRIPT,
      indent,
      parameters: [initLines[0]],
    });
    for (let i = 1; i < initLines.length; i++) {
      commands.push({
        code: EVENT_CODES.SCRIPT_LINE,
        indent,
        parameters: [initLines[i]],
      });
    }

    // Input Message command (wait for choice)
    // Use Show Choices with empty callback - the script callback handles routing
    commands.push({
      code: EVENT_CODES.SHOW_CHOICES,
      indent,
      parameters: [
        [], // Empty - choices set by script
        -1, // Cancel type handled by script
        0,
        data.windowPosition ?? 2,
        data.windowBackground ?? 0,
      ],
    });

    // Generate conditional branches based on the mapped choice index (TEMP_CHOICE_VAR)
    choices.forEach((_choice, index) => {
      // Conditional: if $gameVariables.value(TEMP_CHOICE_VAR) == index
      commands.push({
        code: EVENT_CODES.CONDITIONAL_BRANCH,
        indent,
        parameters: [1, TEMP_CHOICE_VAR, 0, index, 0], // Type 1=Variable, TEMP_CHOICE_VAR, Op 0==, Value index
      });

      // Process target node for this choice
      const targetId = choiceTargets[index];
      if (targetId) {
        emitNodeOrJump(targetId, indent + 1);
      }

      commands.push({
        code: EVENT_CODES.END,
        indent: indent + 1,
        parameters: [],
      });
      commands.push({
        code: EVENT_CODES.CONDITIONAL_END,
        indent,
        parameters: [],
      });
    });
  }

  // Helper to generate action commands
  function generateActionCommands(node: InteractionNode, indent: number): void {
    const data = node.data as ActionNodeData;
    const actions = data.actions || [];

    for (const action of actions) {
      switch (action.type) {
        case "script":
          if (action.script) {
            const lines = action.script.split("\n");
            commands.push({
              code: EVENT_CODES.SCRIPT,
              indent,
              parameters: [lines[0]],
            });
            for (let i = 1; i < lines.length; i++) {
              commands.push({
                code: EVENT_CODES.SCRIPT_LINE,
                indent,
                parameters: [lines[i]],
              });
            }
          }
          break;

        case "set_switch":
          if (action.switchId !== undefined) {
            let operation: number;
            switch (action.switchValue) {
              case "on":
                operation = 0; // RMMZ: 0 = Set to ON
                break;
              case "off":
                operation = 1; // RMMZ: 1 = Set to OFF
                break;
              case "toggle":
                // RMMZ doesn't have native toggle - warn and default to ON
                console.warn(
                  "Toggle not supported in direct export, defaulting to ON",
                );
                operation = 0;
                break;
              default:
                operation = 0;
            }
            commands.push({
              code: EVENT_CODES.CONTROL_SWITCHES,
              indent,
              parameters: [action.switchId, action.switchId, operation],
            });
          }
          break;

        case "set_variable":
          if (action.variableId !== undefined) {
            const opMap: Record<string, number> = {
              set: 0,
              add: 1,
              sub: 2,
              mul: 3,
              div: 4,
              mod: 5,
            };
            const operation = opMap[action.variableOperation || "set"] || 0;
            commands.push({
              code: EVENT_CODES.CONTROL_VARIABLES,
              indent,
              parameters: [
                action.variableId,
                action.variableId,
                operation,
                0, // Operand type (constant)
                action.variableValue || 0,
              ],
            });
          }
          break;

        case "common_event":
          if (action.commonEventId !== undefined) {
            commands.push({
              code: EVENT_CODES.COMMON_EVENT,
              indent,
              parameters: [action.commonEventId],
            });
          }
          break;

        case "show_text":
          if (action.text) {
            commands.push({
              code: EVENT_CODES.SHOW_TEXT,
              indent,
              parameters: [
                action.faceName || "",
                action.faceIndex || 0,
                action.textBackground ?? 0,
                action.textPosition ?? 2,
              ],
            });
            const lines = action.text.split("\n");
            for (const line of lines) {
              commands.push({
                code: EVENT_CODES.TEXT_LINE,
                indent,
                parameters: [line],
              });
            }
          }
          break;

        case "plugin_command":
          if (action.pluginName && action.commandName) {
            commands.push({
              code: EVENT_CODES.PLUGIN_COMMAND,
              indent,
              parameters: [
                action.pluginName,
                action.commandName,
                action.commandArgs || {},
              ],
            });
          }
          break;
      }
    }
  }

  // Helper to generate condition commands
  function generateConditionCommands(
    node: InteractionNode,
    indent: number,
  ): void {
    const data = node.data as ConditionNodeData;
    const condition = data.condition;

    if (!condition) {
      console.warn("Condition node has no condition defined");
      return;
    }

    // Find true/false branches
    const outEdges = edgesBySource.get(node.id) || [];
    let trueTarget: string | null = null;
    let falseTarget: string | null = null;

    for (const edge of outEdges) {
      if (edge.sourceHandle === "true") trueTarget = edge.target;
      else if (edge.sourceHandle === "false") falseTarget = edge.target;
    }

    // Generate condition based on type
    let conditionParams: unknown[] = [];

    switch (condition.type) {
      case "switch":
        conditionParams = [
          0,
          condition.switchId || 0,
          condition.switchValue === "on" ? 0 : 1,
        ];
        break;

      case "variable": {
        const opMap: Record<string, number> = {
          "==": 0,
          ">=": 1,
          "<=": 2,
          ">": 3,
          "<": 4,
          "!=": 5,
        };
        conditionParams = [
          1,
          condition.variableId || 0,
          0, // Compare to constant
          condition.variableCompareValue || 0,
          opMap[condition.variableOperator || "=="] || 0,
        ];
        break;
      }

      case "script":
        conditionParams = [12, condition.script || "true"];
        break;
    }

    // Conditional Branch
    commands.push({
      code: EVENT_CODES.CONDITIONAL_BRANCH,
      indent,
      parameters: conditionParams,
    });

    // True branch
    if (trueTarget) {
      emitNodeOrJump(trueTarget, indent + 1);
    }
    commands.push({
      code: EVENT_CODES.END,
      indent: indent + 1,
      parameters: [],
    });

    // Else branch
    commands.push({
      code: EVENT_CODES.CONDITIONAL_ELSE,
      indent,
      parameters: [],
    });

    // False branch
    if (falseTarget) {
      emitNodeOrJump(falseTarget, indent + 1);
    }
    commands.push({
      code: EVENT_CODES.END,
      indent: indent + 1,
      parameters: [],
    });

    // End conditional
    commands.push({
      code: EVENT_CODES.CONDITIONAL_END,
      indent,
      parameters: [],
    });
  }

  // Start processing from start node
  const startEdges = edgesBySource.get(startNode.id) || [];
  if (startEdges.length > 0) {
    processNode(startEdges[0].target, 0);
  }

  // Add terminating command
  commands.push({ code: EVENT_CODES.END, indent: 0, parameters: [] });

  return commands;
}

// Export commands as JSON string (for clipboard)
export function exportAsJSON(document: InteractionDocument): string {
  const commands = exportToMZCommands(document);
  return JSON.stringify(commands, null, 2);
}
