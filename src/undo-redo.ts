import { GraphData } from './data/storage';

interface Snapshot {
  nodes: any[];
  edges: any[];
  groups: any[];
}

const MAX_STACK = 50;

export class UndoManager {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  pushSnapshot(graph: GraphData): void {
    this.redoStack = [];
    this.undoStack.push({
      nodes: JSON.parse(JSON.stringify(graph.nodes)),
      edges: JSON.parse(JSON.stringify(graph.edges)),
      groups: JSON.parse(JSON.stringify(graph.groups)),
    });
    if (this.undoStack.length > MAX_STACK) this.undoStack.shift();
  }

  undo(graph: GraphData): boolean {
    const snap = this.undoStack.pop();
    if (!snap) return false;
    this.redoStack.push({
      nodes: JSON.parse(JSON.stringify(graph.nodes)),
      edges: JSON.parse(JSON.stringify(graph.edges)),
      groups: JSON.parse(JSON.stringify(graph.groups)),
    });
    graph.nodes = snap.nodes;
    graph.edges = snap.edges;
    graph.groups = snap.groups;
    return true;
  }

  redo(graph: GraphData): boolean {
    const snap = this.redoStack.pop();
    if (!snap) return false;
    this.undoStack.push({
      nodes: JSON.parse(JSON.stringify(graph.nodes)),
      edges: JSON.parse(JSON.stringify(graph.edges)),
      groups: JSON.parse(JSON.stringify(graph.groups)),
    });
    graph.nodes = snap.nodes;
    graph.edges = snap.edges;
    graph.groups = snap.groups;
    return true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
