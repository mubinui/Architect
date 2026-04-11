import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/store/project.store';
import { getFurnitureForRoom, FurnitureItem } from '../../core/data/furniture-presets';
import { WebScannerComponent } from '../../shared/components/web-scanner.component';
import { CatalogService } from '../../core/services/catalog.service';
import { CatalogItem } from '../../core/models/catalog.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, WebScannerComponent],
  template: `
    <div class="detail">
      @if (!room()) {
        <div class="state-center"><div class="spinner"></div></div>
      } @else {
        <!-- Header -->
        <div class="detail-header">
          <a [routerLink]="['/project', projectId]" class="back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back to project
          </a>
          <div class="header-main">
            <h1 class="detail-title">{{ room()!.name }}</h1>
            <div class="header-meta">
              <span class="badge badge--gray">{{ room()!.room_type.replace('_', ' ') }}</span>
              <span class="meta-sep">·</span>
              <span class="meta-dim">{{ room()!.dimensions.width }} ft × {{ room()!.dimensions.length }} ft × {{ room()!.dimensions.height }} ft ceiling</span>
            </div>
          </div>
        </div>

        <!-- Layout -->
        <div class="detail-layout">

          <!-- Left: image -->
          <div class="image-col">
            <div class="image-wrap">
              @if (status() === 'generating') {
                <div class="image-state">
                  <div class="spinner"></div>
                  <span>Generating 3D design…</span>
                </div>
              } @else if (result()) {
                <img [src]="result()!.image_base64" [alt]="room()!.name" class="room-img" />
              } @else {
                <div class="image-state image-state--empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#dadce0" stroke-width="1.25"/>
                    <path d="M3 16L8 11L11 14L15 9L21 16" stroke="#dadce0" stroke-width="1.25" stroke-linejoin="round"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="#dadce0"/>
                  </svg>
                  <span>No image generated yet</span>
                  <button class="btn btn-primary" (click)="regen()">Generate 3D Design</button>
                </div>
              }
            </div>

            <!-- Regen button below image -->
            @if (result()) {
              <div class="image-actions">
                <button class="btn btn-secondary" [disabled]="status() === 'generating'" (click)="regen()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4V10H7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3.51 15C4.15 16.82 5.45 18.33 7.14 19.26C8.83 20.19 10.81 20.47 12.7 20.04C14.6 19.61 16.29 18.5 17.43 16.91C18.57 15.32 19.08 13.36 18.86 11.42C18.64 9.48 17.7 7.68 16.22 6.38C14.73 5.07 12.82 4.36 10.87 4.36C8.92 4.36 7 5.08 5.52 6.4L1 10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Regenerate
                </button>
              </div>
            }
          </div>

          <!-- Right: controls -->
          <div class="controls-col">

            <!-- ── Furniture Editor ── -->
            <div class="card control-card">
              <h3 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
                  <path d="M3 14H21V18H3z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M5 14V10C5 9 6 8 7 8H17C18 8 19 9 19 10V14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M3 14V10" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M21 14V10" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                Furniture
                @if (hasFurnitureChanges()) {
                  <span class="changes-badge">Modified</span>
                }
              </h3>

              <!-- Current furniture items -->
              <div class="furn-edit-grid">
                @for (f of availableFurniture(); track f.id) {
                  <button
                    type="button"
                    class="furn-edit-card"
                    [class.furn-edit-card--active]="isFurnitureSelected(f.id)"
                    (click)="toggleItem(f.id)"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" [innerHTML]="f.icon"></svg>
                    <span class="furn-edit-label">{{ f.label }}</span>
                    @if (isFurnitureSelected(f.id)) {
                      <div class="furn-edit-check">✓</div>
                    }
                  </button>
                }
              </div>

              <!-- Regen with changes -->
              @if (hasFurnitureChanges()) {
                <div class="furn-actions">
                  <button class="btn btn-secondary btn-sm" (click)="resetFurniture()">Reset</button>
                  <button
                    class="btn btn-primary btn-sm"
                    [disabled]="status() === 'generating'"
                    (click)="applyFurnitureChanges()"
                  >
                    @if (status() === 'generating') {
                      <div class="spinner" style="width:14px;height:14px;border-width:2px;border-color:#fff3;border-top-color:#fff"></div>
                    } @else {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
                      </svg>
                    }
                    Regenerate with changes
                  </button>
                </div>
              }
            </div>

            <!-- ── Modify Design (text) ── -->
            <div class="card control-card">
              <h3 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
                  <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                  <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Custom Changes
              </h3>
              <div class="form-field">
                <textarea
                  [(ngModel)]="modText"
                  rows="3"
                  placeholder="e.g., Add a floor-to-ceiling bookshelf on the left wall…"
                ></textarea>
              </div>
              <button
                class="btn btn-primary"
                style="width:100%"
                [disabled]="!modText.trim() || status() === 'generating'"
                (click)="modify()"
              >
                @if (status() === 'generating') {
                  <div class="spinner" style="width:16px;height:16px;border-width:2px;border-color:#fff3;border-top-color:#fff"></div>
                  Applying…
                } @else {
                  Apply Changes
                }
              </button>
            </div>

            <!-- ── Reference Images ── -->
            <div class="card control-card">
              <h3 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M3 16L8 11L11 14L15 9L21 16" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                </svg>
                Reference Images
              </h3>
              <p class="ref-hint">Upload photos of furniture, tiles, or materials you want in this room</p>

              @if (referenceImages.length) {
                <div class="ref-grid">
                  @for (img of referenceImages; track $index; let i = $index) {
                    <div class="ref-thumb">
                      <img [src]="img" alt="Reference" />
                      <button class="ref-remove" (click)="removeRefImage(i)">×</button>
                    </div>
                  }
                </div>
              }

              <app-web-scanner (imageSelected)="onWebImageScanned($event)"></app-web-scanner>
              
              <div style="text-align:center;font-size:11px;color:#9aa0a6;margin-bottom:8px">or</div>
              <button class="ref-upload-btn" (click)="refFileInput.click()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Upload File from Computer
              </button>
              <input #refFileInput type="file" accept="image/*" style="display:none" (change)="onRefFileSelected($event)" />
            </div>

            <!-- Selected Catalog Items -->
            <div class="card control-card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <h3 class="section-title" style="margin:0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right:6px">
                    <path d="M3 9L12 2L21 9V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
                  </svg>
                  My Catalog Items
                </h3>
                <button class="btn btn-secondary btn-sm" (click)="showCatalogPicker.set(true)">
                  Add from Catalog
                </button>
              </div>
              <p class="ref-hint" style="margin-top:-6px">Selected catalog items will automatically guide the design.</p>
              
              @if (room()?.selected_catalog_items?.length) {
                <div class="ref-grid" style="margin-top:12px">
                  @for (cat_id of room()!.selected_catalog_items; track cat_id) {
                    <div class="ref-thumb">
                      @if (catalogItemsMap.get(cat_id)?.image_base64) {
                        <img [src]="catalogItemsMap.get(cat_id)?.image_base64" [alt]="catalogItemsMap.get(cat_id)?.name" />
                      } @else {
                        <div class="state-center" style="padding:10px; font-size:24px; background:#f0f2f5;">📦</div>
                      }
                      <button class="ref-remove" (click)="removeCatalogItem(cat_id)">×</button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Room Details -->
            <div class="card control-card">
              <h3 class="section-title">Room Details</h3>
              @if (room()!.furniture_preferences.length) {
                <div class="detail-row">
                  <span class="detail-label">Furniture</span>
                  <div class="chip-list">
                    @for (f of room()!.furniture_preferences; track f) {
                      <span class="chip">{{ f }}</span>
                    }
                  </div>
                </div>
              }
              @if (room()!.notes) {
                <div class="detail-row">
                  <span class="detail-label">Notes</span>
                  <p class="detail-notes">{{ room()!.notes }}</p>
                </div>
              }
              @if (!room()!.furniture_preferences.length && !room()!.notes) {
                <p class="empty-details">No additional details specified</p>
              }
            </div>

            <!-- Generated Prompt -->
            @if (result()) {
              <div class="card control-card">
                <button class="prompt-toggle" (click)="showPrompt.set(!showPrompt())">
                  <span class="section-title" style="margin:0">Generated Prompt</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" [style.transform]="showPrompt() ? 'rotate(180deg)' : ''">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                @if (showPrompt()) {
                  <p class="prompt-text">{{ result()!.generated_prompt }}</p>
                }
              </div>
            }

            <!-- Modification History -->
            @if (result() && result()!.modification_history.length) {
              <div class="card control-card">
                <h3 class="section-title">History</h3>
                <ol class="history-list">
                  @for (m of result()!.modification_history; track $index) {
                    <li>{{ m }}</li>
                  }
                </ol>
              </div>
            }
          </div>
        </div>
      }
      <!-- Catalog Picker Modal -->
      @if (showCatalogPicker()) {
        <div class="modal-backdrop" (click)="showCatalogPicker.set(false)">
          <div class="modal card" (click)="$event.stopPropagation()">
            <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
              <h2 style="margin:0; font-family:'Google Sans', sans-serif; font-weight:400;">Select Catalog Items</h2>
              <button class="btn btn-icon" (click)="showCatalogPicker.set(false)">×</button>
            </div>
            
            <div class="catalog-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; max-height: 400px; overflow-y:auto; padding-right:8px;">
              @for (item of availableCatalogItems(); track item.id) {
                <div class="item-card" 
                     style="border: 2px solid transparent; cursor: pointer; border-radius: 8px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
                     [style.border-color]="room()?.selected_catalog_items?.includes(item.id) ? '#1a73e8' : 'transparent'"
                     (click)="toggleCatalogItem(item.id)">
                  <div class="item-card__image" style="aspect-ratio:4/3; background:#f0f2f5;">
                    @if (item.image_base64) {
                      <img [src]="item.image_base64" style="width:100%; height:100%; object-fit:cover;" />
                    } @else {
                      <div class="state-center" style="height:100%; font-size:32px;">📦</div>
                    }
                  </div>
                  <div style="padding: 10px;">
                    <div style="font-size:12px; font-weight:600; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ item.name }}</div>
                  </div>
                </div>
              }
            </div>
            @if (!availableCatalogItems().length) {
              <div class="state-center" style="padding:40px; text-align:center; color:#5f6368;">
                No items in your catalog yet.<br/>
                <a routerLink="/catalog" style="color:#1a73e8; text-decoration:none;">Go back and browse the catalog</a>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .state-center { display:flex; justify-content:center; padding:80px; }

    .detail-header {
      margin-bottom: 28px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #1a73e8;
      text-decoration: none;
      margin-bottom: 12px;
      &:hover { text-decoration: underline; }
    }
    .detail-title {
      font-family: 'Google Sans','Roboto',sans-serif;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
      margin: 0 0 8px;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-sep { color: #bdc1c6; }
    .meta-dim { font-size: 13px; color: #5f6368; }

    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 20px;
      align-items: start;
    }

    .image-col { position: sticky; top: 80px; }

    .image-wrap {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e8eaed;
      aspect-ratio: 4/3;
      background: #f8f9fa;
    }
    .room-img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .image-state {
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #1a73e8;
      font-size: 13px;
      font-weight: 500;
      &--empty {
        color: #9aa0a6;
        font-weight: 400;
      }
    }
    .image-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }

    .controls-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .control-card { padding: 16px 20px; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    /* ── Furniture editor ── */
    .furn-edit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
      gap: 6px;
      margin-bottom: 12px;
    }
    .furn-edit-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 4px 8px;
      background: #fff;
      border: 1.5px solid #e8eaed;
      border-radius: 8px;
      cursor: pointer;
      transition: all .15s;
      svg { color: #9aa0a6; transition: color .15s; }
      &--active {
        border-color: #1a73e8;
        background: #f0f4ff;
        svg { color: #1a73e8; }
        .furn-edit-label { color: #1a73e8; }
      }
      &:hover:not(.furn-edit-card--active) {
        border-color: #bdc1c6;
        background: #f8f9fa;
      }
    }
    .furn-edit-label {
      font-size: 9px;
      font-weight: 500;
      color: #5f6368;
      text-align: center;
      line-height: 1.2;
    }
    .furn-edit-check {
      position: absolute;
      top: 3px; right: 3px;
      width: 14px; height: 14px;
      background: #1a73e8;
      color: #fff;
      border-radius: 50%;
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .changes-badge {
      font-size: 10px;
      font-weight: 600;
      color: #e37400;
      background: #fef3e0;
      padding: 2px 8px;
      border-radius: 10px;
      margin-left: auto;
    }
    .furn-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid #f1f3f4;
    }
    .btn-sm {
      font-size: 12px;
      padding: 6px 14px;
      height: 32px;
    }

    .detail-row {
      margin-bottom: 12px;
      &:last-child { margin-bottom: 0; }
    }
    .detail-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #9aa0a6;
      margin-bottom: 6px;
    }
    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .detail-notes {
      font-size: 13px;
      color: #3c4043;
      margin: 0;
      line-height: 1.5;
    }
    .empty-details {
      font-size: 13px;
      color: #9aa0a6;
      margin: 0;
    }

    .prompt-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: inherit;
      margin-bottom: 0;
      svg { color: #5f6368; transition: transform .2s; flex-shrink:0; }
    }
    .prompt-text {
      font-size: 12px;
      line-height: 1.7;
      color: #5f6368;
      margin: 12px 0 0;
    }

    .history-list {
      margin: 0;
      padding-left: 16px;
      li {
        font-size: 12px;
        color: #5f6368;
        margin-bottom: 6px;
        line-height: 1.5;
      }
    }

    /* ── Reference Images ── */
    .ref-hint {
      font-size: 11px;
      color: #9aa0a6;
      margin: 0 0 10px;
    }
    .ref-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 6px;
      margin-bottom: 10px;
    }
    .ref-thumb {
      position: relative;
      aspect-ratio: 1;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #e8eaed;
      img {
        width: 100%; height: 100%;
        object-fit: cover;
        display: block;
      }
    }
    .ref-remove {
      position: absolute;
      top: 2px; right: 2px;
      width: 18px; height: 18px;
      background: rgba(0,0,0,.6);
      color: #fff;
      border: none;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover { background: #d93025; }
    }
    .ref-upload-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      height: 34px;
      justify-content: center;
      background: #fff;
      border: 1.5px dashed #dadce0;
      border-radius: 6px;
      color: #1a73e8;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      &:hover { border-color: #1a73e8; background: #f8f9ff; }
    }

    /* ── Modal ── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .modal {
      width: 520px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
    }

    @media (max-width: 900px) {
      .detail-layout { grid-template-columns: 1fr; }
      .image-col { position: static; }
    }
  `,
})
export class RoomDetailComponent implements OnInit {
  modText = '';
  showPrompt = signal(false);
  projectId = '';
  private roomId = '';

  project;
  room;
  result;
  status;

  // Furniture editor state — simple arrays, not fragile computed chains
  editedFurnitureList: string[] = [];
  originalFurnitureList: string[] = [];
  furnitureInitialized = false;

  // Reference images uploaded by the user
  referenceImages: string[] = [];
  
  // Catalog Items
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
      console.error("Failed to load catalog items", e);
    }
  }

  private initFurniture() {
    const room = this.room();
    if (!room) return;
    const available = this.availableFurniture();
    // Convert furniture_preferences labels → IDs
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

    // Build modification prompt
    const parts: string[] = [];
    if (removed.length) {
      parts.push(`Remove the following from the room: ${removed.join(', ')}`);
    }
    if (added.length) {
      parts.push(`Add the following to the room: ${added.join(', ')}`);
    }
    const modPrompt = parts.join('. ') + '. Keep everything else the same.';

    // If there's an existing result, modify it. Otherwise generate fresh.
    if (this.result()) {
      await this.store.modifyRoom(this.roomId, modPrompt, this.referenceImages);
    } else {
      await this.store.generateRoom(this.roomId, this.referenceImages);
    }

    // Reset furniture edit state to reflect new state
    this.originalFurnitureList = [...this.editedFurnitureList];
  }

  // ── Reference Image Handlers ──

  onWebImageScanned(url: string) {
    this.referenceImages = [...this.referenceImages, url];
  }

  async toggleCatalogItem(itemId: string) {
    const room = this.room();
    if (!room) return;
    const currentList = room.selected_catalog_items || [];
    let updatedList: string[];
    if (currentList.includes(itemId)) {
      updatedList = currentList.filter(id => id !== itemId);
    } else {
      updatedList = [...currentList, itemId];
    }
    
    // Save to backend immediately
    await this.store.updateRoom(this.roomId, {
      ...room,
      selected_catalog_items: updatedList
    });
  }

  async removeCatalogItem(itemId: string) {
    const room = this.room();
    if (!room) return;
    const currentList = room.selected_catalog_items || [];
    if (!currentList.includes(itemId)) return;
    const updatedList = currentList.filter(id => id !== itemId);
    
    await this.store.updateRoom(this.roomId, {
      ...room,
      selected_catalog_items: updatedList
    });
  }

  onRefFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.referenceImages = [...this.referenceImages, reader.result as string];
    };
    reader.readAsDataURL(file);
    input.value = ''; // reset so same file can be re-uploaded
  }

  removeRefImage(index: number) {
    this.referenceImages = this.referenceImages.filter((_, i) => i !== index);
  }
}
