import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  OnInit, OnDestroy, signal, computed, HostListener, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RoomSpec, BlueprintElement, RoomType } from '../../core/models';
import { EditorState } from './floorplan-editor-state';
import { FloorplanToolbarComponent, ToolDragData } from './floorplan-editor-toolbar.component';
import { renderFloorplanPng } from './floorplan-editor-renderer';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

@Component({
  selector: 'app-floorplan-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FloorplanToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor-wrap">
      <!-- Toolbar -->
      <app-floorplan-toolbar
        [roomType]="spec.room_type"
        [snapEnabled]="state.snapEnabled"
        [zoom]="state.zoom"
        [selectedPaletteId]="state.selectedPaletteId"
        (save)="saveFloorplan()"
        (snapToggle)="state.snapEnabled.update(v => !v)"
        (resetView)="state.resetView()"
        (paletteChange)="state.selectedPaletteId.set($event)"
      ></app-floorplan-toolbar>

      <!-- Viewport -->
      <div
        class="viewport"
        #viewport
        (wheel)="onWheel($event)"
        (pointerdown)="onViewportPointerDown($event)"
        (pointermove)="onViewportPointerMove($event)"
        (pointerup)="onViewportPointerUp($event)"
        (pointerleave)="onViewportPointerUp($event)"
        (dragover)="$event.preventDefault()"
        (drop)="onDropToBoard($event)"
        [class.viewport--panning]="state.isPanning() || state.spaceHeld()"
        tabindex="0">

        <div class="canvas-layer"
             [style.transform]="canvasTransform()">

          <div class="board" #board [style.aspect-ratio]="boardRatio()">
            <!-- Grid -->
            <div class="grid-overlay"
                 [style.background-size]="gridBgSize()"></div>

            <!-- Elements -->
            @for (el of state.elements(); track el.id) {
              <div
                class="bp-el"
                [class.bp-el--selected]="state.selectedId() === el.id"
                [class.type-wall]="el.type === 'wall'"
                [class.type-door]="el.type === 'door'"
                [class.type-window]="el.type === 'window'"
                [style.left.px]="el.x"
                [style.top.px]="el.y"
                [style.width.px]="el.w"
                [style.height.px]="el.h"
                [style.transform]="'rotate(' + el.r + 'deg)'"
                (pointerdown)="onElementPointerDown($event, el)">

                <svg class="el-icon" viewBox="0 0 24 24" fill="none"
                     [innerHTML]="getIcon(el.type)"></svg>
                <span class="el-label">{{ el.label }}</span>

                <!-- Handles (when selected) -->
                @if (state.selectedId() === el.id) {
                  <!-- Resize handles -->
                  <div class="handle handle-nw" (pointerdown)="onResizeDown($event, el, 'nw')"></div>
                  <div class="handle handle-n"  (pointerdown)="onResizeDown($event, el, 'n')"></div>
                  <div class="handle handle-ne" (pointerdown)="onResizeDown($event, el, 'ne')"></div>
                  <div class="handle handle-e"  (pointerdown)="onResizeDown($event, el, 'e')"></div>
                  <div class="handle handle-se" (pointerdown)="onResizeDown($event, el, 'se')"></div>
                  <div class="handle handle-s"  (pointerdown)="onResizeDown($event, el, 's')"></div>
                  <div class="handle handle-sw" (pointerdown)="onResizeDown($event, el, 'sw')"></div>
                  <div class="handle handle-w"  (pointerdown)="onResizeDown($event, el, 'w')"></div>

                  <!-- Rotation handle -->
                  <div class="rotation-stem"></div>
                  <div class="rotation-handle" (pointerdown)="onRotateDown($event, el)">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M1 4V10H7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M3.51 15C4.15 17 5.45 18.5 7.14 19.5C8.83 20.3 10.81 20.5 12.7 20C14.6 19.6 16.29 18.5 17.43 16.9C18.57 15.3 19 13.4 18.86 11.4C18.6 9.5 17.7 7.7 16.2 6.4C14.7 5.1 12.8 4.4 10.9 4.4C9 4.4 7 5.1 5.5 6.4L1 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>

                  <!-- Delete button -->
                  <button class="delete-btn" (pointerdown)="onDeleteClick($event, el.id)">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Zoom indicator overlay -->
        <div class="zoom-badge">{{ zoomPercent() }}%</div>

        <!-- Help overlay (subtle) -->
        @if (!state.elements().length) {
          <div class="empty-hint">
            <p>Drag components from the left panel onto the canvas</p>
            <p class="sub">Space+drag to pan &middot; Scroll to zoom &middot; R to rotate</p>
          </div>
        }
      </div>

      <!-- Hidden canvas for export -->
      <canvas #renderCanvas style="display:none;"></canvas>
    </div>
  `,
  styles: [`
    .editor-wrap {
      display: flex;
      min-height: 500px;
      height: 70vh;
      border: 1px solid #dadce0;
      border-radius: 12px;
      overflow: hidden;
      background: #f8f9fa;
    }

    @media (max-width: 768px) {
      .editor-wrap {
        flex-direction: column;
        height: auto;
        min-height: 0;
      }
      :host ::ng-deep .toolbar {
        width: 100% !important;
        min-width: 0 !important;
        border-right: none !important;
        border-bottom: 1px solid #dadce0;
        max-height: 45vh;
        overflow-y: auto;
      }
      .viewport {
        min-height: 50vh;
      }
    }

    /* ── Viewport ── */
    .viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: crosshair;
      outline: none;
      background:
        radial-gradient(circle at 50% 50%, #f8f9fa 0%, #eef0f2 100%);
    }
    .viewport--panning { cursor: grab; }
    .viewport--panning:active { cursor: grabbing; }

    .canvas-layer {
      transform-origin: 0 0;
      will-change: transform;
    }

    .board {
      position: relative;
      background: #ffffff;
      width: 600px;
      margin: 40px;
      border: 2px solid #3c4043;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      border-radius: 2px;
      overflow: visible;
    }

    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, #e8eaed 1px, transparent 1px),
        linear-gradient(to bottom, #e8eaed 1px, transparent 1px);
      background-size: 20px 20px;
      opacity: 0.5;
      pointer-events: none;
    }

    /* ── Elements ── */
    .bp-el {
      position: absolute;
      background: #f0f4ff;
      border: 2px solid #4285f4;
      border-radius: 3px;
      min-width: 20px;
      min-height: 15px;
      cursor: move;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      box-sizing: border-box;
      user-select: none;
      transition: box-shadow 0.1s;
      transform-origin: center center;
      overflow: hidden;
    }
    .bp-el--selected {
      box-shadow: 0 0 0 2px rgba(66,133,244,0.3), 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10;
      overflow: visible;
    }

    .el-icon {
      width: 20px;
      height: 20px;
      color: #4285f4;
      pointer-events: none;
      flex-shrink: 0;
    }
    .el-label {
      font-size: 9px;
      font-weight: 700;
      pointer-events: none;
      text-transform: uppercase;
      text-align: center;
      color: #3c4043;
      line-height: 1;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 2px;
    }

    /* Type Styles */
    .type-wall {
      background: #3c4043;
      border-color: #202124;
      .el-icon { color: #fff; }
      .el-label { color: #fff; }
    }
    .type-door {
      background: #fce8e6;
      border-color: #d93025;
      border-style: dashed;
      border-radius: 0;
      .el-icon { color: #d93025; }
      .el-label { color: #c5221f; }
    }
    .type-window {
      background: #e4f7fb;
      border-color: #12b5cb;
      border-width: 3px;
      .el-icon { color: #0d8c9c; }
      .el-label { color: #0d8c9c; }
    }

    /* ── Handles ── */
    .handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #fff;
      border: 2px solid #4285f4;
      border-radius: 2px;
      z-index: 20;
    }
    .handle-nw { top: -6px; left: -6px; cursor: nw-resize; }
    .handle-n  { top: -6px; left: calc(50% - 5px); cursor: n-resize; }
    .handle-ne { top: -6px; right: -6px; cursor: ne-resize; }
    .handle-e  { top: calc(50% - 5px); right: -6px; cursor: e-resize; }
    .handle-se { bottom: -6px; right: -6px; cursor: se-resize; }
    .handle-s  { bottom: -6px; left: calc(50% - 5px); cursor: s-resize; }
    .handle-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
    .handle-w  { top: calc(50% - 5px); left: -6px; cursor: w-resize; }

    /* ── Rotation ── */
    .rotation-stem {
      position: absolute;
      top: -28px;
      left: calc(50% - 0.5px);
      width: 1px;
      height: 22px;
      background: #4285f4;
      z-index: 19;
      pointer-events: none;
    }
    .rotation-handle {
      position: absolute;
      top: -38px;
      left: calc(50% - 10px);
      width: 20px;
      height: 20px;
      background: #fff;
      border: 2px solid #4285f4;
      border-radius: 50%;
      z-index: 20;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4285f4;
      &:active { cursor: grabbing; }
    }

    /* ── Delete ── */
    .delete-btn {
      position: absolute;
      top: -12px;
      right: -12px;
      width: 22px;
      height: 22px;
      background: #d93025;
      color: #fff;
      border: 2px solid #fff;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 20;
      transition: background .1s;
      &:hover { background: #b71c1c; }
    }

    /* ── Overlays ── */
    .zoom-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(255,255,255,0.9);
      border: 1px solid #dadce0;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      color: #5f6368;
      pointer-events: none;
      font-variant-numeric: tabular-nums;
    }

    .empty-hint {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      p {
        font-size: 14px;
        color: #9aa0a6;
        margin: 0;
        font-weight: 500;
      }
      .sub {
        font-size: 12px;
        margin-top: 6px;
        font-weight: 400;
      }
    }
  `]
})
export class FloorplanEditorComponent implements OnInit, OnDestroy {
  @Input() spec!: RoomSpec;
  @Output() save = new EventEmitter<{ elements: BlueprintElement[]; image: string }>();

  @ViewChild('viewport') viewportRef!: ElementRef<HTMLDivElement>;
  @ViewChild('board') boardRef!: ElementRef<HTMLDivElement>;
  @ViewChild('renderCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  state = new EditorState();
  boardRatio = signal('1 / 1');

  // Icon cache
  private iconCache = new Map<string, SafeHtml>();
  // SVG icon map (populated from toolbar drag data)
  private iconSvgMap = new Map<string, string>();

  // Drag interaction state
  private interaction: null | {
    type: 'move' | 'resize' | 'rotate' | 'pan';
    elementId?: string;
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
    initR: number;
    historyPushed: boolean;
  } = null;

  canvasTransform = computed(() =>
    `translate(${this.state.panX()}px, ${this.state.panY()}px) scale(${this.state.zoom()})`
  );

  gridBgSize = computed(() => {
    const g = this.state.gridSize();
    return `${g}px ${g}px`;
  });

  zoomPercent = computed(() => Math.round(this.state.zoom() * 100));

  constructor(private sanitizer: DomSanitizer) {}

  // ── Lifecycle ──

  ngOnInit() {
    if (this.spec.blueprint_elements?.length) {
      this.state.loadElements(this.spec.blueprint_elements);
    }
    const dim = this.spec.dimensions;
    if (dim) {
      this.boardRatio.set(`${dim.width} / ${dim.length}`);
    }
  }

  ngOnDestroy() {
    // cleanup if needed
  }

  // ── Keyboard Shortcuts ──

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Don't capture when typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    const meta = event.metaKey || event.ctrlKey;

    if (event.key === ' ') {
      event.preventDefault();
      this.state.spaceHeld.set(true);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.state.selectedId()) {
        event.preventDefault();
        this.state.deleteSelected();
      }
      return;
    }
    if (event.key === 'Escape') {
      this.state.selectedId.set(null);
      return;
    }
    if (event.key === 'r' && !meta) {
      event.preventDefault();
      this.state.rotateSelected(event.shiftKey ? -90 : 90);
      return;
    }
    if (event.key === 'g' && !meta) {
      this.state.snapEnabled.update(v => !v);
      return;
    }
    if (meta && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.state.redo();
      else this.state.undo();
      return;
    }
    if (meta && event.key === 'y') {
      event.preventDefault();
      this.state.redo();
      return;
    }
    if (meta && event.key === 'd') {
      event.preventDefault();
      this.state.duplicateSelected();
      return;
    }
    if (event.key === '[') { this.state.sendToBack(); return; }
    if (event.key === ']') { this.state.bringToFront(); return; }
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.key === ' ') {
      this.state.spaceHeld.set(false);
    }
  }

  // ── Wheel Zoom ──

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const viewportRect = this.viewportRef.nativeElement.getBoundingClientRect();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.state.zoomAt(event.clientX, event.clientY, viewportRect, delta);
  }

  // ── Viewport Pointer Events (Pan + Click-to-deselect) ──

  onViewportPointerDown(event: PointerEvent) {
    // Only start pan from empty space (not from elements)
    const target = event.target as HTMLElement;
    if (target.closest('.bp-el')) return;

    // Middle mouse always pans
    if (event.button === 1 || this.state.spaceHeld()) {
      event.preventDefault();
      this.state.isPanning.set(true);
      this.interaction = {
        type: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        initX: this.state.panX(),
        initY: this.state.panY(),
        initW: 0, initH: 0, initR: 0,
        historyPushed: false,
      };
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      return;
    }

    // Left click on empty space → deselect
    if (event.button === 0) {
      this.state.selectedId.set(null);
    }
  }

  onViewportPointerMove(event: PointerEvent) {
    if (!this.interaction) return;

    const dx = event.clientX - this.interaction.startX;
    const dy = event.clientY - this.interaction.startY;

    switch (this.interaction.type) {
      case 'pan':
        this.state.panX.set(this.interaction.initX + dx);
        this.state.panY.set(this.interaction.initY + dy);
        break;

      case 'move': {
        if (!this.interaction.historyPushed) {
          this.state.pushHistory();
          this.interaction.historyPushed = true;
        }
        const zoom = this.state.zoom();
        const newX = this.state.snap(this.interaction.initX + dx / zoom);
        const newY = this.state.snap(this.interaction.initY + dy / zoom);
        this.state.updateElement(this.interaction.elementId!, { x: newX, y: newY });
        break;
      }

      case 'resize': {
        if (!this.interaction.historyPushed) {
          this.state.pushHistory();
          this.interaction.historyPushed = true;
        }
        this.applyResize(dx, dy);
        break;
      }

      case 'rotate': {
        if (!this.interaction.historyPushed) {
          this.state.pushHistory();
          this.interaction.historyPushed = true;
        }
        this.applyRotation(event);
        break;
      }
    }
  }

  onViewportPointerUp(event: PointerEvent) {
    if (this.interaction?.type === 'pan') {
      this.state.isPanning.set(false);
    }
    this.interaction = null;
    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {}
  }

  // ── Element Interactions ──

  onElementPointerDown(event: PointerEvent, el: BlueprintElement) {
    event.stopPropagation();
    event.preventDefault();

    // If space is held, treat as pan
    if (this.state.spaceHeld() || event.button === 1) {
      this.onViewportPointerDown(event);
      return;
    }

    this.state.selectedId.set(el.id);
    this.interaction = {
      type: 'move',
      elementId: el.id,
      startX: event.clientX,
      startY: event.clientY,
      initX: el.x,
      initY: el.y,
      initW: el.w,
      initH: el.h,
      initR: el.r,
      historyPushed: false,
    };
    this.viewportRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onResizeDown(event: PointerEvent, el: BlueprintElement, handle: ResizeHandle) {
    event.stopPropagation();
    event.preventDefault();
    this.interaction = {
      type: 'resize',
      elementId: el.id,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      initX: el.x,
      initY: el.y,
      initW: el.w,
      initH: el.h,
      initR: el.r,
      historyPushed: false,
    };
    this.viewportRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onRotateDown(event: PointerEvent, el: BlueprintElement) {
    event.stopPropagation();
    event.preventDefault();
    this.interaction = {
      type: 'rotate',
      elementId: el.id,
      startX: event.clientX,
      startY: event.clientY,
      initX: el.x,
      initY: el.y,
      initW: el.w,
      initH: el.h,
      initR: el.r,
      historyPushed: false,
    };
    this.viewportRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onDeleteClick(event: PointerEvent, id: string) {
    event.stopPropagation();
    event.preventDefault();
    this.state.selectedId.set(id);
    this.state.deleteSelected();
  }

  // ── Resize Math ──

  private applyResize(rawDx: number, rawDy: number) {
    if (!this.interaction?.handle) return;

    const zoom = this.state.zoom();
    const dx = rawDx / zoom;
    const dy = rawDy / zoom;
    const { initX, initY, initW, initH } = this.interaction;
    const h = this.interaction.handle;

    let x = initX, y = initY, w = initW, hh = initH;

    // Horizontal
    if (h.includes('e')) {
      w = Math.max(20, this.state.snap(initW + dx));
    }
    if (h.includes('w')) {
      const newW = Math.max(20, this.state.snap(initW - dx));
      x = this.state.snap(initX + (initW - newW));
      w = newW;
    }
    // Vertical
    if (h.includes('s')) {
      hh = Math.max(15, this.state.snap(initH + dy));
    }
    if (h.includes('n')) {
      const newH = Math.max(15, this.state.snap(initH - dy));
      y = this.state.snap(initY + (initH - newH));
      hh = newH;
    }

    this.state.updateElement(this.interaction.elementId!, { x, y, w, h: hh });
  }

  // ── Rotation Math ──

  private applyRotation(event: PointerEvent) {
    if (!this.interaction) return;
    const el = this.state.elements().find(e => e.id === this.interaction!.elementId);
    if (!el) return;

    const board = this.boardRef.nativeElement;
    const boardRect = board.getBoundingClientRect();
    const zoom = this.state.zoom();

    // Element center in screen coords
    const centerX = boardRect.left + (el.x + el.w / 2) * zoom;
    const centerY = boardRect.top + (el.y + el.h / 2) * zoom;

    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    let degrees = (angle * 180 / Math.PI) + 90; // +90 because handle is above
    if (degrees < 0) degrees += 360;

    // Snap to 15-degree increments
    degrees = Math.round(degrees / 15) * 15;
    this.state.updateElement(this.interaction.elementId!, { r: degrees % 360 });
  }

  // ── Drop from Toolbar ──

  onDropToBoard(event: DragEvent) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('application/json');
    if (!data) return;

    try {
      const tool: ToolDragData = JSON.parse(data);
      const viewportRect = this.viewportRef.nativeElement.getBoundingClientRect();

      // Convert drop position to board-local coords
      const boardX = (event.clientX - viewportRect.left - this.state.panX()) / this.state.zoom() - 40; // 40 = board margin
      const boardY = (event.clientY - viewportRect.top - this.state.panY()) / this.state.zoom() - 40;

      const x = Math.max(0, boardX - tool.w / 2);
      const y = Math.max(0, boardY - tool.h / 2);

      const newEl: BlueprintElement = {
        id: 'el_' + Math.random().toString(36).substring(2, 11),
        type: tool.type,
        label: tool.label,
        x: this.state.snap(x),
        y: this.state.snap(y),
        w: tool.w,
        h: tool.h,
        r: 0,
      };

      // Store icon for this type
      if (tool.icon) {
        this.iconSvgMap.set(tool.type, tool.icon);
      }

      this.state.addElement(newEl);
    } catch {}
  }

  // ── Icon Helper ──

  getIcon(type: string): SafeHtml {
    let cached = this.iconCache.get(type);
    if (cached) return cached;

    const svg = this.iconSvgMap.get(type) ?? this.getDefaultIcon(type);
    cached = this.sanitizer.bypassSecurityTrustHtml(svg);
    this.iconCache.set(type, cached);
    return cached;
  }

  private getDefaultIcon(type: string): string {
    switch (type) {
      case 'wall':
        return '<rect x="4" y="2" width="16" height="20" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.3"/>';
      case 'door':
        return '<rect x="4" y="8" width="16" height="8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="3 2"/>';
      case 'window':
        return '<rect x="3" y="8" width="18" height="8" stroke="currentColor" stroke-width="2" fill="none"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>';
      case 'bed':
        return '<rect x="2" y="10" width="20" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="4" y="6" width="16" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>';
      case 'sofa':
        return '<path d="M3 14H21V18H3z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 14V10C5 9 6 8 7 8H17C18 8 19 9 19 10V14" stroke="currentColor" stroke-width="1.5" fill="none"/>';
      case 'table':
        return '<rect x="4" y="10" width="16" height="2" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="12" x2="6" y2="18" stroke="currentColor" stroke-width="1.5"/><line x1="18" y1="12" x2="18" y2="18" stroke="currentColor" stroke-width="1.5"/>';
      case 'storage':
        return '<rect x="5" y="3" width="14" height="18" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="15" x2="19" y2="15" stroke="currentColor" stroke-width="1.5"/>';
      default:
        return '<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>';
    }
  }

  // ── Save / Export ──

  async saveFloorplan() {
    this.state.selectedId.set(null); // deselect to hide handles

    const canvas = this.canvasRef.nativeElement;
    const base64 = await renderFloorplanPng(
      canvas,
      this.state.elements(),
      this.spec,
      this.iconSvgMap,
      this.state.selectedPaletteId(),
    );

    this.save.emit({
      elements: this.state.elements(),
      image: base64,
    });
  }
}
