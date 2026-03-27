import { describe, it, expect, beforeEach } from "vitest";
import { useDocumentStore } from "../index";
import type { InteractionNode, InteractionEdge, VariablePreset } from "../../types";

function resetStore(): void {
  useDocumentStore.setState({
    document: {
      version: "1.0.0",
      name: "Test",
      description: "",
      nodes: [],
      edges: [],
      variables: [],
      bookmarks: [],
    },
    savedPath: null,
    isDirty: false,
  });
}

const sampleNode: InteractionNode = {
  id: "n1",
  type: "action",
  position: { x: 100, y: 200 },
  data: { type: "action", label: "Act1", actions: [] },
};

const sampleEdge: InteractionEdge = {
  id: "e1",
  source: "n1",
  target: "n2",
};

describe("DocumentStore — node CRUD", () => {
  beforeEach(resetStore);

  it("addNode adds a node and sets dirty", () => {
    useDocumentStore.getState().addNode(sampleNode);
    const state = useDocumentStore.getState();
    expect(state.document.nodes).toHaveLength(1);
    expect(state.document.nodes[0]!.id).toBe("n1");
    expect(state.isDirty).toBe(true);
  });

  it("updateNode merges partial data", () => {
    useDocumentStore.getState().addNode(sampleNode);
    useDocumentStore.getState().updateNode("n1", {
      data: { ...sampleNode.data, label: "Updated" },
    });

    const node = useDocumentStore.getState().document.nodes[0]!;
    expect(node.data.label).toBe("Updated");
    expect(node.position).toEqual({ x: 100, y: 200 }); // unchanged
  });

  it("removeNode removes node and connected edges", () => {
    const n2: InteractionNode = {
      id: "n2",
      type: "end",
      position: { x: 0, y: 0 },
      data: { type: "end", label: "End" },
    };
    useDocumentStore.getState().addNode(sampleNode);
    useDocumentStore.getState().addNode(n2);
    useDocumentStore.getState().addEdge(sampleEdge);

    expect(useDocumentStore.getState().document.edges).toHaveLength(1);

    useDocumentStore.getState().removeNode("n1");
    const state = useDocumentStore.getState();
    expect(state.document.nodes).toHaveLength(1);
    expect(state.document.nodes[0]!.id).toBe("n2");
    expect(state.document.edges).toHaveLength(0); // edge cleaned up
  });

  it("setNodes replaces all nodes", () => {
    useDocumentStore.getState().addNode(sampleNode);
    const newNodes: InteractionNode[] = [
      { id: "x1", type: "start", position: { x: 0, y: 0 }, data: { type: "start", label: "S" } },
      { id: "x2", type: "end", position: { x: 0, y: 0 }, data: { type: "end", label: "E" } },
    ];
    useDocumentStore.getState().setNodes(newNodes);

    expect(useDocumentStore.getState().document.nodes).toHaveLength(2);
    expect(useDocumentStore.getState().document.nodes[0]!.id).toBe("x1");
  });
});

describe("DocumentStore — edge CRUD", () => {
  beforeEach(resetStore);

  it("addEdge adds an edge and sets dirty", () => {
    useDocumentStore.getState().addEdge(sampleEdge);
    expect(useDocumentStore.getState().document.edges).toHaveLength(1);
    expect(useDocumentStore.getState().isDirty).toBe(true);
  });

  it("updateEdge merges partial data", () => {
    useDocumentStore.getState().addEdge(sampleEdge);
    useDocumentStore.getState().updateEdge("e1", { sourceHandle: "true" });

    const edge = useDocumentStore.getState().document.edges[0]!;
    expect(edge.sourceHandle).toBe("true");
    expect(edge.source).toBe("n1"); // unchanged
  });

  it("removeEdge removes edge", () => {
    useDocumentStore.getState().addEdge(sampleEdge);
    useDocumentStore.getState().removeEdge("e1");
    expect(useDocumentStore.getState().document.edges).toHaveLength(0);
  });

  it("setEdges replaces all edges", () => {
    useDocumentStore.getState().addEdge(sampleEdge);
    useDocumentStore.getState().setEdges([{ id: "e2", source: "a", target: "b" }]);
    expect(useDocumentStore.getState().document.edges).toHaveLength(1);
    expect(useDocumentStore.getState().document.edges[0]!.id).toBe("e2");
  });
});

describe("DocumentStore — presets", () => {
  beforeEach(resetStore);

  it("addPreset / updatePreset / removePreset", () => {
    const preset: VariablePreset = { id: "p1", name: "Test Preset", description: "", variables: [] };
    useDocumentStore.getState().addPreset(preset);
    expect(useDocumentStore.getState().document.variables).toHaveLength(1);

    useDocumentStore.getState().updatePreset("p1", { name: "Updated" });
    expect(useDocumentStore.getState().document.variables[0]!.name).toBe("Updated");

    useDocumentStore.getState().removePreset("p1");
    expect(useDocumentStore.getState().document.variables).toHaveLength(0);
  });
});

describe("DocumentStore — bookmarks", () => {
  beforeEach(resetStore);

  it("toggleBookmark adds and removes", () => {
    useDocumentStore.getState().toggleBookmark("n1");
    expect(useDocumentStore.getState().document.bookmarks).toEqual(["n1"]);

    useDocumentStore.getState().toggleBookmark("n1");
    expect(useDocumentStore.getState().document.bookmarks).toEqual([]);
  });

  it("removeBookmark removes specific bookmark", () => {
    useDocumentStore.getState().toggleBookmark("n1");
    useDocumentStore.getState().toggleBookmark("n2");
    useDocumentStore.getState().removeBookmark("n1");
    expect(useDocumentStore.getState().document.bookmarks).toEqual(["n2"]);
  });

  it("removeNode also removes its bookmark", () => {
    useDocumentStore.getState().addNode(sampleNode);
    useDocumentStore.getState().toggleBookmark("n1");
    useDocumentStore.getState().removeNode("n1");
    expect(useDocumentStore.getState().document.bookmarks).toEqual([]);
  });
});

describe("DocumentStore — document lifecycle", () => {
  beforeEach(resetStore);

  it("setDocument replaces document and clears dirty", () => {
    useDocumentStore.getState().addNode(sampleNode); // sets dirty
    expect(useDocumentStore.getState().isDirty).toBe(true);

    useDocumentStore.getState().setDocument({
      version: "2.0.0",
      name: "New",
      description: "",
      nodes: [],
      edges: [],
      variables: [],
      bookmarks: [],
    });

    expect(useDocumentStore.getState().document.name).toBe("New");
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it("newDocument creates fresh document", () => {
    useDocumentStore.getState().addNode(sampleNode);
    useDocumentStore.getState().setSavedPath("/some/path.mzinteraction");

    useDocumentStore.getState().newDocument();
    const state = useDocumentStore.getState();
    expect(state.document.nodes.length).toBeGreaterThanOrEqual(1); // fresh doc has a start node
    expect(state.savedPath).toBeNull();
    expect(state.isDirty).toBe(false);
  });
});
