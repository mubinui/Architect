import { signal, computed } from '@angular/core';
import { BlueprintElement } from '../../core/models';

export class EditorState {
  // Core data
  elements = signal<BlueprintElement[]>([]);
  selectedId = signal<string | null>(null);

  // Viewport
  panX = signal(0);
  panY = signal(0);
  zoom = signal(1);

  // Grid
  gridSize = signal(20);
  snapEnabled = signal(true);

  // Interaction mode
  isPanning = signal(false);
  spaceHeld = signal(false);

  // Color palette
  selectedPaletteId = signal<string | null>(null);

  // Undo / Redo
  private undoStack: BlueprintElement[][] = [];
  private redoStack: BlueprintElement[][] = [];
  private maxHistory = 50;

  canUndo = computed(() => this.undoStack.length > 0);
  canRedo = computed(() => this.redoStack.length > 0);

  // ── History ──

  pushHistory() {
    this.undoStack.push(this.cloneElements());
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.cloneElements());
    this.elements.set(this.undoStack.pop()!);
    this.selectedId.set(null);
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.cloneElements());
    this.elements.set(this.redoStack.pop()!);
    this.selectedId.set(null);
  }

  // ── Element CRUD ──

  addElement(el: BlueprintElement) {
    this.pushHistory();
    const snapped = this.snapEnabled()
      ? { ...el, x: this.snap(el.x), y: this.snap(el.y) }
      : el;
    this.elements.update(list => [...list, snapped]);
    this.selectedId.set(el.id);
  }

  updateElement(id: string, patch: Partial<BlueprintElement>) {
    this.elements.update(list =>
      list.map(el => (el.id === id ? { ...el, ...patch } : el))
    );
  }

  deleteSelected() {
    const id = this.selectedId();
    if (!id) return;
    this.pushHistory();
    this.elements.update(list => list.filter(el => el.id !== id));
    this.selectedId.set(null);
  }

  rotateSelected(degrees: number) {
    const id = this.selectedId();
    if (!id) return;
    this.pushHistory();
    this.elements.update(list =>
      list.map(el =>
        el.id === id ? { ...el, r: (el.r + degrees) % 360 } : el
      )
    );
  }

  duplicateSelected() {
    const id = this.selectedId();
    if (!id) return;
    const src = this.elements().find(el => el.id === id);
    if (!src) return;
    const dup: BlueprintElement = {
      ...src,
      id: 'el_' + Math.random().toString(36).substring(2, 11),
      x: src.x + 20,
      y: src.y + 20,
    };
    this.addElement(dup);
  }

  bringToFront() {
    const id = this.selectedId();
    if (!id) return;
    this.pushHistory();
    this.elements.update(list => {
      const el = list.find(e => e.id === id);
      if (!el) return list;
      return [...list.filter(e => e.id !== id), el];
    });
  }

  sendToBack() {
    const id = this.selectedId();
    if (!id) return;
    this.pushHistory();
    this.elements.update(list => {
      const el = list.find(e => e.id === id);
      if (!el) return list;
      return [el, ...list.filter(e => e.id !== id)];
    });
  }

  // ── Coordinate Transforms ──

  /** Convert screen (client) coordinates to board-local coordinates */
  screenToBoard(clientX: number, clientY: number, boardRect: DOMRect): { x: number; y: number } {
    const x = (clientX - boardRect.left - this.panX()) / this.zoom();
    const y = (clientY - boardRect.top - this.panY()) / this.zoom();
    return { x, y };
  }

  /** Zoom toward a point (keeps that point visually fixed) */
  zoomAt(clientX: number, clientY: number, viewportRect: DOMRect, delta: number) {
    const oldZoom = this.zoom();
    const newZoom = Math.max(0.25, Math.min(3.0, oldZoom + delta));
    if (newZoom === oldZoom) return;

    // Point relative to viewport
    const mx = clientX - viewportRect.left;
    const my = clientY - viewportRect.top;

    // Adjust pan so the point under cursor stays fixed
    const scale = newZoom / oldZoom;
    this.panX.update(px => mx - scale * (mx - px));
    this.panY.update(py => my - scale * (my - py));
    this.zoom.set(newZoom);
  }

  // ── Snap ──

  snap(value: number): number {
    if (!this.snapEnabled()) return value;
    const g = this.gridSize();
    return Math.round(value / g) * g;
  }

  // ── Helpers ──

  private cloneElements(): BlueprintElement[] {
    return this.elements().map(el => ({ ...el }));
  }

  /** Load initial elements (e.g. from saved RoomSpec) */
  loadElements(elements: BlueprintElement[]) {
    this.elements.set(elements.map(el => ({ ...el })));
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.selectedId.set(null);
  }

  /** Reset viewport to center */
  resetView() {
    this.panX.set(0);
    this.panY.set(0);
    this.zoom.set(1);
  }
}
