import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomType } from '../../core/models';
import { getFurnitureForRoom, FurnitureItem } from '../../core/data/furniture-presets';
import { STRUCTURAL_PRESETS, StructuralPreset, getFurnitureSize } from './floorplan-editor-data';
import { COLOR_PALETTES, ColorPalette } from '../../core/data/design-presets';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface ToolDragData {
  type: string;
  label: string;
  w: number;
  h: number;
  icon?: string;
}

@Component({
  selector: 'app-floorplan-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toolbar">
      <!-- Search -->
      <div class="search-box">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          type="text"
          class="search-input"
          placeholder="Search components..."
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
        />
      </div>

      <div class="sections-scroll">
        <!-- Structural -->
        <div class="section">
          <button class="section-header" (click)="toggleSection('structural')">
            <span>Structural</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 [style.transform]="collapsedSections().has('structural') ? '' : 'rotate(180deg)'"
                 style="transition: transform .2s">
              <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          @if (!collapsedSections().has('structural')) {
            <div class="items-grid">
              @for (preset of filteredStructural(); track preset.type) {
                <div
                  class="tool-item"
                  draggable="true"
                  (dragstart)="onDragStructural($event, preset)"
                  [title]="preset.label">
                  <div class="tool-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" [innerHTML]="trustIcon(preset.icon)"></svg>
                  </div>
                  <span class="tool-label">{{ preset.label }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Furniture by category -->
        @for (cat of filteredCategories(); track cat.name) {
          <div class="section">
            <button class="section-header" (click)="toggleSection(cat.name)">
              <span>{{ cat.name }}</span>
              <span class="cat-count">{{ cat.items.length }}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   [style.transform]="collapsedSections().has(cat.name) ? '' : 'rotate(180deg)'"
                   style="transition: transform .2s">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            @if (!collapsedSections().has(cat.name)) {
              <div class="items-grid">
                @for (item of cat.items; track item.id) {
                  <div
                    class="tool-item"
                    draggable="true"
                    (dragstart)="onDragFurniture($event, item)"
                    [title]="item.label">
                    <div class="tool-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" [innerHTML]="trustIcon(item.icon)"></svg>
                    </div>
                    <span class="tool-label">{{ item.label }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Bottom controls -->
      <div class="bottom-panel">
        <!-- Color Palette -->
        <div class="section">
          <button class="section-header" (click)="toggleSection('palette')">
            <span>Color Palette</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 [style.transform]="collapsedSections().has('palette') ? '' : 'rotate(180deg)'"
                 style="transition: transform .2s">
              <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          @if (!collapsedSections().has('palette')) {
            <div class="palette-list">
              @for (pal of palettes; track pal.id) {
                <button
                  class="palette-row"
                  [class.palette-row--active]="selectedPaletteId() === pal.id"
                  (click)="selectPalette(pal)">
                  <div class="palette-swatches">
                    @for (c of pal.colors; track c) {
                      <div class="swatch" [style.background]="c"></div>
                    }
                  </div>
                  <span class="palette-name">{{ pal.name }}</span>
                </button>
              }
            </div>
          }
        </div>

        <!-- View controls -->
        <div class="view-controls">
          <button class="ctrl-btn" (click)="snapToggle.emit()" [class.ctrl-btn--active]="snapEnabled()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
              <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
              <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
              <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Snap
          </button>
          <button class="ctrl-btn" (click)="resetView.emit()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
            Reset View
          </button>
          <div class="zoom-display">{{ zoomPercent() }}%</div>
        </div>

        <button class="btn-save" (click)="save.emit()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          Lock Floorplan
        </button>
        <p class="hint">Renders schematic to guide AI generation.</p>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      width: 230px;
      background: #fff;
      border-right: 1px solid #dadce0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .search-box {
      position: relative;
      padding: 12px 12px 8px;
      border-bottom: 1px solid #f1f3f4;
    }
    .search-icon {
      position: absolute;
      left: 22px;
      top: 22px;
      color: #9aa0a6;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 32px;
      padding: 0 10px 0 30px;
      border: 1px solid #e8eaed;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
      background: #f8f9fa;
      box-sizing: border-box;
      &:focus { border-color: #1a73e8; background: #fff; }
    }

    .sections-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .section {
      padding: 0 12px;
      margin-bottom: 2px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 8px 0;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #5f6368;
      svg { color: #9aa0a6; flex-shrink: 0; margin-left: auto; }
    }

    .cat-count {
      font-size: 10px;
      font-weight: 500;
      color: #9aa0a6;
      background: #f1f3f4;
      border-radius: 8px;
      padding: 1px 6px;
    }

    .items-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      padding-bottom: 6px;
    }

    .tool-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px 6px;
      background: #f8f9fa;
      border: 1px solid #e8eaed;
      border-radius: 6px;
      cursor: grab;
      transition: all .12s;
      &:hover { border-color: #1a73e8; background: #f0f4ff; }
      &:active { cursor: grabbing; transform: scale(0.95); }
    }

    .tool-icon {
      color: #5f6368;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tool-label {
      font-size: 10px;
      font-weight: 500;
      color: #3c4043;
      text-align: center;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .bottom-panel {
      border-top: 1px solid #e8eaed;
      padding: 8px 12px 12px;
    }

    .palette-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding-bottom: 8px;
      max-height: 140px;
      overflow-y: auto;
    }

    .palette-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      background: none;
      border: 1.5px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: all .12s;
      &:hover { background: #f8f9fa; }
      &--active { border-color: #1a73e8; background: #f0f4ff; }
    }

    .palette-swatches {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(0,0,0,0.1);
    }
    .palette-name {
      font-size: 11px;
      color: #3c4043;
      font-weight: 500;
    }

    .view-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 10px;
    }

    .ctrl-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      height: 28px;
      background: #f1f3f4;
      border: 1px solid #e8eaed;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      color: #5f6368;
      cursor: pointer;
      transition: all .12s;
      &:hover { border-color: #bdc1c6; }
      &--active { border-color: #1a73e8; color: #1a73e8; background: #e8f0fe; }
    }

    .zoom-display {
      margin-left: auto;
      font-size: 11px;
      font-weight: 600;
      color: #5f6368;
      font-variant-numeric: tabular-nums;
    }

    .btn-save {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 36px;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      &:hover { background: #1765cc; }
      &:active { background: #1557b0; }
    }

    .hint {
      font-size: 10px;
      color: #9aa0a6;
      text-align: center;
      margin: 6px 0 0;
    }
  `]
})
export class FloorplanToolbarComponent {
  @Input() roomType: RoomType = 'bedroom';
  @Input() snapEnabled = signal(true);
  @Input() zoom = signal(1);
  @Input() selectedPaletteId = signal<string | null>(null);

  @Output() save = new EventEmitter<void>();
  @Output() snapToggle = new EventEmitter<void>();
  @Output() resetView = new EventEmitter<void>();
  @Output() paletteChange = new EventEmitter<string | null>();

  searchQuery = '';
  palettes = COLOR_PALETTES;

  collapsedSections = signal(new Set<string>());

  zoomPercent = computed(() => Math.round(this.zoom() * 100));

  constructor(private sanitizer: DomSanitizer) {}

  // ── Filtered items ──

  filteredStructural(): StructuralPreset[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return STRUCTURAL_PRESETS;
    return STRUCTURAL_PRESETS.filter(p => p.label.toLowerCase().includes(q));
  }

  filteredCategories(): { name: string; items: FurnitureItem[] }[] {
    const q = this.searchQuery.toLowerCase().trim();
    const items = getFurnitureForRoom(this.roomType);
    const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q)) : items;

    // Group by category
    const catMap = new Map<string, FurnitureItem[]>();
    for (const item of filtered) {
      const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1);
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(item);
    }
    return Array.from(catMap.entries()).map(([name, items]) => ({ name, items }));
  }

  // ── Drag handlers ──

  onDragStructural(event: DragEvent, preset: StructuralPreset) {
    const data: ToolDragData = {
      type: preset.type,
      label: preset.label,
      w: preset.w,
      h: preset.h,
      icon: preset.icon,
    };
    event.dataTransfer?.setData('application/json', JSON.stringify(data));
  }

  onDragFurniture(event: DragEvent, item: FurnitureItem) {
    const size = getFurnitureSize(item.id);
    const data: ToolDragData = {
      type: item.id,
      label: item.label,
      w: size.w,
      h: size.h,
      icon: item.icon,
    };
    event.dataTransfer?.setData('application/json', JSON.stringify(data));
  }

  // ── Palette ──

  selectPalette(pal: ColorPalette) {
    const newId = this.selectedPaletteId() === pal.id ? null : pal.id;
    this.paletteChange.emit(newId);
  }

  // ── Helpers ──

  toggleSection(name: string) {
    this.collapsedSections.update(set => {
      const next = new Set(set);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  onSearch() {
    // expand all sections when searching
    if (this.searchQuery.trim()) {
      this.collapsedSections.set(new Set());
    }
  }

  trustIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
