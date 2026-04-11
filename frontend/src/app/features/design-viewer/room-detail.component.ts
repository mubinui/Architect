import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/store/project.store';
import { getFurnitureForRoom, FurnitureItem } from '../../core/data/furniture-presets';
import { WebScannerComponent } from '../../shared/components/web-scanner.component';
import { FloorplanEditorComponent } from './floorplan-editor.component';
import { CatalogService } from '../../core/services/catalog.service';
import { CatalogItem } from '../../core/models/catalog.model';
import { BlueprintElement } from '../../core/models/room.model';
import { firstValueFrom } from 'rxjs';

type MainTab = 'blueprint' | 'design';
type SideSection = 'furniture' | 'references' | 'details';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, WebScannerComponent, FloorplanEditorComponent],
  template: `
    <div class="page">
      @if (!room()) {
        <div class="loader"><div class="spinner"></div></div>
      } @else {

        <!-- ── Topbar ── -->
        <header class="topbar">
          <a [routerLink]="['/project', projectId]" class="topbar-back" title="Back to project">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <h1 class="topbar-name">{{ room()!.name }}</h1>
          <span class="topbar-type">{{ room()!.room_type.replace('_', ' ') }}</span>
          <span class="topbar-dims">{{ room()!.dimensions.width }}' &times; {{ room()!.dimensions.length }}' &times; {{ room()!.dimensions.height }}'</span>

          <!-- 2 rounded tabs in the center -->
          <div class="topbar-spacer"></div>
          <div class="tab-group">
            <button
              class="tab"
              [class.tab--active]="activeTab() === 'blueprint'"
              (click)="activeTab.set('blueprint')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"/></svg>
              Blueprint
            </button>
            <button
              class="tab"
              [class.tab--active]="activeTab() === 'design'"
              (click)="activeTab.set('design')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 15L8 10L13 15" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 13L17 10L21 14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/></svg>
              Design
            </button>
          </div>
          <div class="topbar-spacer"></div>

          <button
            class="topbar-gen"
            [disabled]="status() === 'generating'"
            (click)="regen()">
            @if (status() === 'generating') {
              <div class="spinner-sm"></div> Generating...
            } @else if (result()) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15C4.15 16.82 5.45 18.33 7.14 19.26C8.83 20.19 10.81 20.47 12.7 20.04C14.6 19.61 16.29 18.5 17.43 16.91C18.57 15.32 19.08 13.36 18.86 11.42C18.64 9.48 17.7 7.68 16.22 6.38C14.73 5.07 12.82 4.36 10.87 4.36C8.92 4.36 7 5.08 5.52 6.4L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Regenerate
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              Generate
            }
          </button>
        </header>

        <!-- ═══ CONTENT ═══ -->
        <div class="content">

          <!-- ── BLUEPRINT TAB ── -->
          @if (activeTab() === 'blueprint') {
            <div class="content-fill">
              <app-floorplan-editor [spec]="room()!" (save)="onFloorplanSave($event)"></app-floorplan-editor>
            </div>
          }

          <!-- ── DESIGN TAB ── -->
          @if (activeTab() === 'design') {
            <div class="design-layout">

              <!-- Left: generated image -->
              <div class="design-main">
                <div class="img-area">
                  @if (status() === 'generating') {
                    <div class="img-state"><div class="spinner"></div><span>Generating 3D design...</span></div>
                  } @else if (result()) {
                    <img [src]="result()!.image_base64" [alt]="room()!.name" class="gen-img" />
                  } @else {
                    <div class="img-state img-state--empty">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1"/><path d="M3 16L8 11L11 14L15 9L21 16" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/></svg>
                      <span>No image generated yet</span>
                      <button class="inline-gen" (click)="regen()" [disabled]="status() === 'generating'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
                        Generate 3D Design
                      </button>
                    </div>
                  }
                </div>

                <!-- Modify bar below image -->
                <div class="modify-bar">
                  <textarea
                    class="modify-input"
                    [(ngModel)]="modText"
                    rows="1"
                    placeholder="Describe changes... e.g. Add a bookshelf on the left wall"
                  ></textarea>
                  <button
                    class="modify-btn"
                    [disabled]="!modText.trim() || status() === 'generating'"
                    (click)="modify()">
                    Apply
                  </button>
                </div>

                <!-- Collapsible prompt + history -->
                @if (result()) {
                  <div class="meta-row">
                    <button class="collapse-btn" (click)="showPrompt.set(!showPrompt())">
                      Generated Prompt
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" [style.transform]="showPrompt() ? 'rotate(180deg)' : ''"><path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    @if (result()!.modification_history.length) {
                      <span class="meta-badge">{{ result()!.modification_history.length }} edits</span>
                    }
                  </div>
                  @if (showPrompt()) {
                    <p class="prompt-text">{{ result()!.generated_prompt }}</p>
                  }
                }
                @if (result() && result()!.modification_history.length && showPrompt()) {
                  <ol class="history-list">
                    @for (m of result()!.modification_history; track $index) {
                      <li>{{ m }}</li>
                    }
                  </ol>
                }
              </div>

              <!-- Right: sidebar with sub-sections -->
              <aside class="design-sidebar">
                <!-- Sub-section tabs -->
                <div class="side-tabs">
                  @for (s of sideSections; track s.id) {
                    <button
                      class="side-tab"
                      [class.side-tab--active]="activeSide() === s.id"
                      (click)="activeSide.set(s.id)">
                      {{ s.label }}
                    </button>
                  }
                </div>

                <div class="side-body">

                  <!-- FURNITURE -->
                  @if (activeSide() === 'furniture') {
                    <div class="furn-grid">
                      @for (f of availableFurniture(); track f.id) {
                        <button
                          type="button"
                          class="furn-card"
                          [class.furn-card--on]="isFurnitureSelected(f.id)"
                          (click)="toggleItem(f.id)">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" [innerHTML]="f.icon"></svg>
                          <span>{{ f.label }}</span>
                          @if (isFurnitureSelected(f.id)) {
                            <div class="furn-tick">&#10003;</div>
                          }
                        </button>
                      }
                    </div>
                    @if (hasFurnitureChanges()) {
                      <div class="furn-actions">
                        <button class="act-btn act-btn--ghost" (click)="resetFurniture()">Reset</button>
                        <button class="act-btn act-btn--primary" [disabled]="status() === 'generating'" (click)="applyFurnitureChanges()">
                          Regenerate
                        </button>
                      </div>
                    }
                  }

                  <!-- REFERENCES -->
                  @if (activeSide() === 'references') {
                    <div class="ref-block">
                      <label class="side-label">Reference Images</label>
                      @if (referenceImages.length) {
                        <div class="ref-grid">
                          @for (img of referenceImages; track $index; let i = $index) {
                            <div class="ref-thumb">
                              <img [src]="img" alt="Reference" />
                              <button class="ref-x" (click)="removeRefImage(i)">&times;</button>
                            </div>
                          }
                        </div>
                      }
                      <app-web-scanner (imageSelected)="onWebImageScanned($event)"></app-web-scanner>
                      <div class="ref-or">or</div>
                      <button class="ref-upload" (click)="refFileInput.click()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        Upload Image
                      </button>
                      <input #refFileInput type="file" accept="image/*" style="display:none" (change)="onRefFileSelected($event)" />
                    </div>

                    <div class="ref-block">
                      <div class="ref-block-head">
                        <label class="side-label">Catalog Items</label>
                        <button class="act-btn act-btn--xs" (click)="showCatalogPicker.set(true)">Add</button>
                      </div>
                      @if (room()?.selected_catalog_items?.length) {
                        <div class="ref-grid">
                          @for (cat_id of room()!.selected_catalog_items; track cat_id) {
                            <div class="ref-thumb">
                              @if (catalogItemsMap.get(cat_id)?.image_base64) {
                                <img [src]="catalogItemsMap.get(cat_id)?.image_base64" [alt]="catalogItemsMap.get(cat_id)?.name" />
                              } @else {
                                <div class="thumb-empty">?</div>
                              }
                              <button class="ref-x" (click)="removeCatalogItem(cat_id)">&times;</button>
                            </div>
                          }
                        </div>
                      } @else {
                        <p class="side-hint" style="opacity:.5">No catalog items selected.</p>
                      }
                    </div>
                  }

                  <!-- DETAILS -->
                  @if (activeSide() === 'details') {
                    <div class="det">
                      <label class="side-label">Dimensions</label>
                      <p class="det-val">{{ room()!.dimensions.width }} ft &times; {{ room()!.dimensions.length }} ft &times; {{ room()!.dimensions.height }} ft ceiling</p>
                    </div>
                    @if (room()!.furniture_preferences.length) {
                      <div class="det">
                        <label class="side-label">Furniture</label>
                        <div class="chip-row">
                          @for (f of room()!.furniture_preferences; track f) {
                            <span class="det-chip">{{ f }}</span>
                          }
                        </div>
                      </div>
                    }
                    @if (room()!.color_preferences?.length) {
                      <div class="det">
                        <label class="side-label">Colors</label>
                        <div class="chip-row">
                          @for (c of room()!.color_preferences; track c) {
                            <span class="det-chip">{{ c }}</span>
                          }
                        </div>
                      </div>
                    }
                    <div class="det">
                      <label class="side-label">Notes</label>
                      <p class="det-val">{{ room()!.notes || 'No additional notes.' }}</p>
                    </div>
                    @if (room()!.blueprint_elements?.length) {
                      <div class="det">
                        <label class="side-label">Blueprint</label>
                        <p class="det-val det-val--accent">{{ room()!.blueprint_elements!.length }} elements mapped</p>
                      </div>
                    }
                  }

                </div>
              </aside>

            </div>
          }

        </div>

        <!-- Catalog picker modal -->
        @if (showCatalogPicker()) {
          <div class="modal-bg" (click)="showCatalogPicker.set(false)">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-top">
                <h2>Select Catalog Items</h2>
                <button class="modal-x" (click)="showCatalogPicker.set(false)">&times;</button>
              </div>
              <div class="catalog-grid">
                @for (item of availableCatalogItems(); track item.id) {
                  <div class="cat-card"
                       [class.cat-card--on]="room()?.selected_catalog_items?.includes(item.id)"
                       (click)="toggleCatalogItem(item.id)">
                    <div class="cat-card-img">
                      @if (item.image_base64) {
                        <img [src]="item.image_base64" />
                      } @else {
                        <div class="thumb-empty" style="height:100%">?</div>
                      }
                    </div>
                    <div class="cat-card-name">{{ item.name }}</div>
                  </div>
                }
              </div>
              @if (!availableCatalogItems().length) {
                <div style="padding:40px;text-align:center;color:#5f6368">
                  No items yet. <a routerLink="/catalog" style="color:#1a73e8">Browse catalog</a>
                </div>
              }
            </div>
          </div>
        }

      }
    </div>
  `,
  styles: `
    /* ═══════════════════════════════════════════
       PAGE
       ═══════════════════════════════════════════ */
    :host { display: block; }
    .page {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      overflow: hidden;
    }
    .loader {
      flex: 1; display: flex;
      align-items: center; justify-content: center;
    }

    /* ═══════════════════════════════════════════
       TOPBAR
       ═══════════════════════════════════════════ */
    .topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 20px;
      height: 52px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }
    .topbar-back {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 8px;
      color: #5f6368; text-decoration: none;
      &:hover { background: #f1f3f4; }
    }
    .topbar-name {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: 16px; font-weight: 600; color: #202124; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .topbar-type {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .04em; color: #5f6368; background: #f1f3f4;
      padding: 3px 10px; border-radius: 6px; white-space: nowrap;
    }
    .topbar-dims { font-size: 11px; color: #9aa0a6; white-space: nowrap; }
    .topbar-spacer { flex: 1; }
    .topbar-gen {
      display: flex; align-items: center; gap: 6px;
      height: 34px; padding: 0 20px;
      background: #1a73e8; color: #fff; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
      &:hover:not(:disabled) { background: #1765cc; }
      &:disabled { opacity: .6; cursor: default; }
    }

    /* ═══════════════════════════════════════════
       2 ROUNDED TABS — centered in topbar
       ═══════════════════════════════════════════ */
    .tab-group {
      display: flex;
      gap: 4px;
      background: #f1f3f4;
      border-radius: 12px;
      padding: 3px;
    }
    .tab {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 22px;
      border-radius: 10px;
      background: transparent;
      border: none;
      font-size: 13px; font-weight: 600;
      color: #5f6368;
      cursor: pointer;
      white-space: nowrap;
      transition: all .15s;
      svg { flex-shrink: 0; color: inherit; }
      &:hover:not(.tab--active) { background: rgba(0,0,0,.04); }
      &--active {
        background: #fff;
        color: #1a73e8;
        box-shadow: 0 1px 3px rgba(0,0,0,.1);
      }
    }

    /* ═══════════════════════════════════════════
       CONTENT — fills everything below topbar
       ═══════════════════════════════════════════ */
    .content {
      flex: 1; min-height: 0;
      display: flex; flex-direction: column;
      overflow: hidden;
    }

    /* Blueprint: editor fills all */
    .content-fill {
      flex: 1; display: flex; min-height: 0;
      app-floorplan-editor {
        flex: 1; display: flex; min-height: 0;
        ::ng-deep .editor-wrap {
          height: 100% !important;
          min-height: 0;
          border: none;
          border-radius: 0;
        }
      }
    }

    /* ═══════════════════════════════════════════
       DESIGN TAB — image left, sidebar right
       ═══════════════════════════════════════════ */
    .design-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 340px;
      min-height: 0;
      overflow: hidden;
    }

    /* ── Image / Main area ── */
    .design-main {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;
      background: #f4f5f7;
    }
    .img-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      padding: 20px;
    }
    .gen-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,.08);
    }
    .img-state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
      color: #1a73e8; font-size: 13px; font-weight: 500;
      &--empty { color: #bdc1c6; }
    }
    .inline-gen {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; padding: 9px 22px;
      background: #1a73e8; color: #fff; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { background: #1765cc; }
      &:disabled { opacity: .6; }
    }

    /* ── Modify bar ── */
    .modify-bar {
      display: flex; gap: 8px;
      padding: 12px 20px;
      background: #fff;
      border-top: 1px solid #e8eaed;
      flex-shrink: 0;
    }
    .modify-input {
      flex: 1;
      border: 1px solid #dadce0; border-radius: 10px;
      padding: 10px 14px; font-size: 13px;
      resize: none; outline: none; font-family: inherit;
      &:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,.1); }
    }
    .modify-btn {
      height: 38px; padding: 0 20px;
      background: #1a73e8; color: #fff; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
      &:hover:not(:disabled) { background: #1765cc; }
      &:disabled { opacity: .5; cursor: default; }
    }

    /* ── Prompt / History ── */
    .meta-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 20px;
      background: #fff;
      border-top: 1px solid #f1f3f4;
      flex-shrink: 0;
    }
    .collapse-btn {
      display: flex; align-items: center; gap: 6px;
      background: none; border: none; cursor: pointer;
      color: #5f6368; font-size: 11px; font-weight: 600;
      svg { transition: transform .2s; }
    }
    .meta-badge {
      font-size: 10px; font-weight: 600; color: #1a73e8;
      background: #e8f0fe; padding: 2px 8px; border-radius: 6px;
    }
    .prompt-text {
      font-size: 11px; line-height: 1.7; color: #5f6368;
      margin: 0; padding: 0 20px 10px;
      background: #fff; word-break: break-word;
    }
    .history-list {
      margin: 0; padding: 0 20px 12px 38px;
      background: #fff;
      li { font-size: 11px; color: #5f6368; margin-bottom: 2px; line-height: 1.5; }
    }

    /* ═══════════════════════════════════════════
       SIDEBAR — Furniture / References / Details
       ═══════════════════════════════════════════ */
    .design-sidebar {
      display: flex;
      flex-direction: column;
      border-left: 1px solid #e0e0e0;
      background: #fff;
      min-height: 0;
    }
    .side-tabs {
      display: flex;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    }
    .side-tab {
      flex: 1;
      padding: 10px 0;
      background: none; border: none;
      border-bottom: 2px solid transparent;
      font-size: 11px; font-weight: 700;
      color: #9aa0a6; cursor: pointer;
      text-transform: uppercase;
      letter-spacing: .03em;
      transition: color .12s;
      &:hover { color: #5f6368; }
      &--active {
        color: #1a73e8;
        border-bottom-color: #1a73e8;
      }
    }
    .side-body {
      flex: 1; overflow-y: auto;
      padding: 14px;
      -webkit-overflow-scrolling: touch;
    }
    .side-label {
      display: block;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
      color: #9aa0a6; margin-bottom: 8px;
    }
    .side-hint {
      font-size: 11px; color: #9aa0a6; margin: 0 0 8px;
    }

    /* ── Furniture ── */
    .furn-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 6px; margin-bottom: 8px;
    }
    .furn-card {
      position: relative;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      padding: 10px 4px 8px;
      background: #fff; border: 1.5px solid #e8eaed; border-radius: 10px;
      cursor: pointer; transition: all .12s;
      svg { color: #9aa0a6; }
      span { font-size: 9px; font-weight: 500; color: #5f6368; text-align: center; line-height: 1.2; }
      &--on {
        border-color: #1a73e8; background: #eef3ff;
        svg { color: #1a73e8; }
        span { color: #1a73e8; }
      }
      &:hover:not(.furn-card--on) { border-color: #bdc1c6; }
    }
    .furn-tick {
      position: absolute; top: 3px; right: 3px;
      width: 14px; height: 14px;
      background: #1a73e8; color: #fff; border-radius: 50%;
      font-size: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .furn-actions {
      display: flex; gap: 6px; justify-content: flex-end;
      padding-top: 8px; border-top: 1px solid #f1f3f4;
    }

    /* ── References ── */
    .ref-block { margin-bottom: 16px; &:last-child { margin-bottom: 0; } }
    .ref-block-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 4px;
    }
    .ref-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
      gap: 6px; margin-bottom: 8px;
    }
    .ref-thumb {
      position: relative; aspect-ratio: 1;
      border-radius: 6px; overflow: hidden; border: 1px solid #e8eaed;
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }
    .ref-x {
      position: absolute; top: 2px; right: 2px;
      width: 16px; height: 16px;
      background: rgba(0,0,0,.55); color: #fff;
      border: none; border-radius: 50%; font-size: 12px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      &:hover { background: #d93025; }
    }
    .ref-or { text-align: center; font-size: 10px; color: #9aa0a6; margin: 4px 0; }
    .ref-upload {
      display: flex; align-items: center; gap: 6px;
      width: 100%; height: 32px; justify-content: center;
      background: #fff; border: 1.5px dashed #dadce0; border-radius: 8px;
      color: #1a73e8; font-size: 11px; font-weight: 500; cursor: pointer;
      &:hover { border-color: #1a73e8; background: #f8f9ff; }
    }
    .thumb-empty {
      display: flex; align-items: center; justify-content: center;
      background: #f1f3f4; color: #9aa0a6;
      font-size: 16px; font-weight: 700;
      width: 100%; aspect-ratio: 1;
    }

    /* ── Details ── */
    .det { margin-bottom: 14px; }
    .det-val {
      font-size: 13px; color: #3c4043; margin: 4px 0 0; line-height: 1.5;
      &--accent { color: #1a73e8; font-weight: 600; }
    }
    .chip-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
    .det-chip {
      font-size: 10px; padding: 3px 10px;
      background: #f1f3f4; border-radius: 8px; color: #3c4043;
    }

    /* ── Action buttons ── */
    .act-btn {
      display: inline-flex; align-items: center; gap: 5px;
      height: 28px; padding: 0 14px;
      border-radius: 8px; font-size: 11px; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      &--primary {
        background: #1a73e8; color: #fff; border: none;
        &:hover:not(:disabled) { background: #1765cc; }
        &:disabled { opacity: .5; }
      }
      &--ghost {
        background: #fff; color: #3c4043; border: 1px solid #dadce0;
        &:hover { background: #f8f9fa; }
      }
      &--xs {
        height: 22px; padding: 0 10px; font-size: 10px;
        background: #fff; color: #1a73e8; border: 1px solid #dadce0; border-radius: 6px;
        &:hover { background: #f8f9ff; }
      }
    }

    /* ═══════════════════════════════════════════
       MODAL
       ═══════════════════════════════════════════ */
    .modal-bg {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.35);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(2px);
    }
    .modal {
      width: 560px; max-width: 92vw; max-height: 80vh;
      overflow-y: auto; padding: 24px;
      background: #fff; border-radius: 14px;
      box-shadow: 0 16px 48px rgba(0,0,0,.15);
    }
    .modal-top {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 18px;
      h2 { margin: 0; font-size: 17px; font-weight: 600; }
    }
    .modal-x {
      width: 30px; height: 30px;
      background: none; border: none; font-size: 22px; color: #5f6368;
      cursor: pointer; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      &:hover { background: #f1f3f4; }
    }
    .catalog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .cat-card {
      border: 2px solid transparent; border-radius: 10px;
      overflow: hidden; background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.08); cursor: pointer;
      &--on { border-color: #1a73e8; }
      &:hover:not(.cat-card--on) { border-color: #dadce0; }
    }
    .cat-card-img {
      aspect-ratio: 4/3; background: #f1f3f4;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .cat-card-name {
      padding: 8px 10px; font-size: 12px; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* ═══════════════════════════════════════════
       SPINNER
       ═══════════════════════════════════════════ */
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid #e8eaed; border-top-color: #1a73e8;
      border-radius: 50%; animation: spin .6s linear infinite;
    }
    .spinner-sm {
      width: 13px; height: 13px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      border-radius: 50%; animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ═══════════════════════════════════════════
       RESPONSIVE
       ═══════════════════════════════════════════ */

    /* Design sidebar stacks below on narrow screens */
    @media (max-width: 900px) {
      .design-layout {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
      }
      .design-sidebar {
        border-left: none;
        border-top: 1px solid #e0e0e0;
        max-height: 45vh;
      }
    }

    /* Mobile */
    @media (max-width: 768px) {
      .topbar { padding: 0 12px; gap: 8px; flex-wrap: wrap; height: auto; min-height: 52px; padding-top: 8px; padding-bottom: 8px; }
      .topbar-dims, .topbar-type { display: none; }
      .topbar-spacer { display: none; }
      .tab-group { order: 10; margin: 4px auto 0; }
      .topbar-gen { order: 5; }

      .tab { padding: 6px 16px; font-size: 12px; }
    }

    /* Phone */
    @media (max-width: 480px) {
      .topbar-name { font-size: 14px; max-width: 120px; }
      .topbar-gen { padding: 0 12px; font-size: 11px; height: 30px; }
      .tab { padding: 5px 14px; font-size: 11px; gap: 5px; }
      .tab svg { width: 14px; height: 14px; }
      .side-body { padding: 10px; }
      .furn-grid { grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); }
    }
  `,
})
export class RoomDetailComponent implements OnInit {
  modText = '';
  showPrompt = signal(false);
  projectId = '';
  private roomId = '';

  activeTab = signal<MainTab>('blueprint');
  activeSide = signal<SideSection>('furniture');

  sideSections: { id: SideSection; label: string }[] = [
    { id: 'furniture', label: 'Furniture' },
    { id: 'references', label: 'References' },
    { id: 'details', label: 'Details' },
  ];

  mobilePanels = [
    { id: 'preview' as const, label: 'Preview' },
    { id: 'blueprint' as const, label: 'Blueprint' },
    { id: 'elements' as const, label: 'Elements' },
  ];

  project;
  room;
  result;
  status;

  editedFurnitureList: string[] = [];
  originalFurnitureList: string[] = [];
  furnitureInitialized = false;

  referenceImages: string[] = [];

  showCatalogPicker = signal(false);
  availableCatalogItems = signal<CatalogItem[]>([]);
  catalogItemsMap = new Map<string, CatalogItem>();

  availableFurniture = computed((): FurnitureItem[] => {
    const roomType = this.room()?.room_type ?? 'bedroom';
    return getFurnitureForRoom(roomType);
  });

  isFurnitureSelected(fid: string): boolean {
    return this.editedFurnitureList.includes(fid);
  }

  hasFurnitureChanges(): boolean {
    if (!this.furnitureInitialized) return false;
    if (this.originalFurnitureList.length !== this.editedFurnitureList.length) return true;
    return !this.originalFurnitureList.every(id => this.editedFurnitureList.includes(id))
        || !this.editedFurnitureList.every(id => this.originalFurnitureList.includes(id));
  }

  constructor(
    public store: ProjectStore,
    private route: ActivatedRoute,
    private catalogService: CatalogService
  ) {
    this.project = this.store.currentProject;
    this.room = computed(() => this.project()?.rooms.find(r => r.id === this.roomId) ?? null);
    this.result = computed(() => this.project()?.results[this.roomId] ?? null);
    this.status = computed(() => this.store.generationStatus().get(this.roomId) ?? 'idle');
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.roomId = this.route.snapshot.paramMap.get('roomId')!;
    if (!this.project() || this.project()?.id !== this.projectId) {
      this.store.loadProject(this.projectId).then(() => this.initFurniture());
    } else {
      this.initFurniture();
    }
    this.loadCatalogItems();
  }

  async loadCatalogItems() {
    try {
      const items = await firstValueFrom(this.catalogService.searchItems());
      this.availableCatalogItems.set(items);
      items.forEach(i => this.catalogItemsMap.set(i.id, i));
    } catch (e) {
      console.error('Failed to load catalog items', e);
    }
  }

  private initFurniture() {
    const room = this.room();
    if (!room) return;
    const available = this.availableFurniture();
    const ids = room.furniture_preferences
      .map(label => available.find(f => f.label.toLowerCase() === label.toLowerCase())?.id)
      .filter((id): id is string => !!id);
    this.originalFurnitureList = [...ids];
    this.editedFurnitureList = [...ids];
    this.furnitureInitialized = true;
  }

  regen() { this.store.generateRoom(this.roomId, this.referenceImages); }

  async modify() {
    const p = this.modText.trim();
    if (!p) return;
    await this.store.modifyRoom(this.roomId, p, this.referenceImages);
    this.modText = '';
  }

  toggleItem(fid: string) {
    const idx = this.editedFurnitureList.indexOf(fid);
    if (idx >= 0) {
      this.editedFurnitureList = this.editedFurnitureList.filter(id => id !== fid);
    } else {
      this.editedFurnitureList = [...this.editedFurnitureList, fid];
    }
  }

  resetFurniture() {
    this.editedFurnitureList = [...this.originalFurnitureList];
  }

  async applyFurnitureChanges() {
    if (!this.hasFurnitureChanges()) return;
    const available = this.availableFurniture();
    const added = this.editedFurnitureList
      .filter(id => !this.originalFurnitureList.includes(id))
      .map(id => available.find(f => f.id === id)?.label)
      .filter(Boolean);
    const removed = this.originalFurnitureList
      .filter(id => !this.editedFurnitureList.includes(id))
      .map(id => available.find(f => f.id === id)?.label)
      .filter(Boolean);

    const parts: string[] = [];
    if (removed.length) parts.push(`Remove the following from the room: ${removed.join(', ')}`);
    if (added.length) parts.push(`Add the following to the room: ${added.join(', ')}`);
    const modPrompt = parts.join('. ') + '. Keep everything else the same.';

    if (this.result()) {
      await this.store.modifyRoom(this.roomId, modPrompt, this.referenceImages);
    } else {
      await this.store.generateRoom(this.roomId, this.referenceImages);
    }
    this.originalFurnitureList = [...this.editedFurnitureList];
  }

  onWebImageScanned(url: string) {
    this.referenceImages = [...this.referenceImages, url];
  }

  async toggleCatalogItem(itemId: string) {
    const room = this.room();
    if (!room) return;
    const currentList = room.selected_catalog_items || [];
    const updatedList = currentList.includes(itemId)
      ? currentList.filter(id => id !== itemId)
      : [...currentList, itemId];
    await this.store.updateRoom(this.roomId, { ...room, selected_catalog_items: updatedList });
  }

  async removeCatalogItem(itemId: string) {
    const room = this.room();
    if (!room) return;
    const currentList = room.selected_catalog_items || [];
    if (!currentList.includes(itemId)) return;
    await this.store.updateRoom(this.roomId, {
      ...room,
      selected_catalog_items: currentList.filter(id => id !== itemId),
    });
  }

  onRefFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.referenceImages = [...this.referenceImages, reader.result as string]; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeRefImage(index: number) {
    this.referenceImages = this.referenceImages.filter((_, i) => i !== index);
  }

  async onFloorplanSave(event: { elements: BlueprintElement[]; image: string }) {
    const room = this.room();
    if (!room) return;
    await this.store.updateRoom(this.roomId, {
      ...room,
      blueprint_elements: event.elements,
      blueprint_image: event.image,
    });
    alert('Floorplan locked! Click Generate to create the 3D design.');
  }
}
