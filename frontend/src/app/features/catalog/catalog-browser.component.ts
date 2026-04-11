import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../core/services/catalog.service';
import { CatalogItem, Shop, CatalogCategory, CustomItemRequest } from '../../core/models/catalog.model';
import { firstValueFrom } from 'rxjs';

import { WebScannerComponent } from '../../shared/components/web-scanner.component';

@Component({
  selector: 'app-catalog-browser',
  standalone: true,
  imports: [RouterLink, FormsModule, WebScannerComponent],
  template: `
    <div class="catalog">
      <!-- Header -->
      <div class="catalog-header">
        <div>
          <a routerLink="/" class="back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Projects
          </a>
          <h1 class="page-title">Design Catalog</h1>
          <p class="page-subtitle">Browse tiles, furniture, lighting & more from curated shops</p>
        </div>
        <button class="btn btn-primary" (click)="showUpload.set(true)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add My Item
        </button>
      </div>

      <!-- Shop Chips (horizontal scroll) -->
      <div class="shop-strip">
        <button
          class="shop-chip"
          [class.shop-chip--active]="activeShop() === ''"
          (click)="activeShop.set(''); loadItems()"
        >All Shops</button>
        @for (shop of shops(); track shop.id) {
          <button
            class="shop-chip"
            [class.shop-chip--active]="activeShop() === shop.id"
            (click)="activeShop.set(shop.id); loadShopItems(shop.id)"
          >
            <span class="shop-emoji">{{ shop.logo_emoji }}</span>
            {{ shop.name }}
          </button>
        }
      </div>

      <!-- Search + Category Tabs -->
      <div class="filter-bar">
        <div class="search-group">
          <div class="domain-select-wrap">
            <select [ngModel]="activeExternalDomain()" (ngModelChange)="activeExternalDomain.set($event)" (change)="onDomainChange()">
              <option value="">Internal Catalog</option>
              <optgroup label="Live Web Scrapers">
                @for (domain of externalDomains; track domain.value) {
                  <option [value]="domain.value">{{ domain.label }}</option>
                }
              </optgroup>
            </select>
            <svg class="select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.75"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              (keyup.enter)="triggerSearch()"
              [placeholder]="activeExternalDomain() ? 'Type a product name and press Enter...' : 'Search items...'"
            />
            @if (searchQuery) {
              <button class="search-clear" (click)="clearSearch()">×</button>
            }
          </div>
          
          @if (activeExternalDomain()) {
            <button class="btn btn-primary search-action-btn" (click)="triggerSearch()">
              Search
            </button>
          }
        </div>

        <div class="category-tabs">
          <button
            class="cat-tab"
            [class.cat-tab--active]="activeCategory() === ''"
            (click)="activeCategory.set(''); loadItems()"
          >All</button>
          @for (cat of categories; track cat) {
            <button
              class="cat-tab"
              [class.cat-tab--active]="activeCategory() === cat.value"
              (click)="activeCategory.set(cat.value); loadItems()"
            >{{ cat.label }}</button>
          }
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="state-center"><div class="spinner"></div></div>
      }

      <!-- Empty -->
      @else if (items().length === 0) {
        <div class="state-center">
          <div style="font-size:32px; margin-bottom:10px">🔍</div>
          <p style="color:#5f6368; margin:0">No items found.</p>
          @if (activeExternalDomain()) {
            <p style="color:#9aa0a6; font-size:12px; margin-top:6px;">Try a different search term. We scan DuckDuckGo live to aggregate these domain results.</p>
          }
        </div>
      }

      <!-- Item Grid -->
      @else {
        <div class="items-grid">
          @for (item of items(); track item.id) {
            <div class="item-card card">
              <div class="item-card__image">
                @if (item.image_base64) {
                  <img [src]="item.image_base64" [alt]="item.name" loading="lazy" />
                } @else {
                  <div class="item-placeholder">
                    <span class="item-placeholder__cat">{{ getCategoryEmoji(item.category) }}</span>
                  </div>
                }
                
                @if (item.tags?.includes('external')) {
                  <div class="item-card__overlay">
                    <button class="btn btn-primary btn-sm" style="width:100%; box-shadow:0 4px 12px rgba(0,0,0,0.15);" (click)="addExternalItem(item)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:6px;">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                      Save to Catalog
                    </button>
                  </div>
                  <div style="position: absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:600; backdrop-filter:blur(2px);">
                    Live Store Map
                  </div>
                }
                
                <span class="item-badge">{{ item.category }}</span>
                @if (item.is_custom) {
                  <span class="item-badge item-badge--custom">My Item</span>
                }
              </div>
              <div class="item-card__body">
                <h3 class="item-name">{{ item.name }}</h3>
                <p class="item-desc">{{ item.description }}</p>
                <div class="item-footer">
                  <span class="item-shop">{{ getShopName(item.shop_id) }}</span>
                  @if (item.is_custom) {
                    <button class="btn btn-icon btn-danger-icon" title="Delete" (click)="deleteCustom(item.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H5H21" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                        <path d="M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6H19Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
              @if (item.tags.length) {
                <div class="item-tags">
                  @for (tag of item.tags.slice(0, 3); track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Upload Modal -->
      @if (showUpload()) {
        <div class="modal-backdrop" (click)="showUpload.set(false)">
          <div class="modal card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Add Custom Item</h2>
              <button class="btn btn-icon" (click)="showUpload.set(false)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div class="form-field">
              <label class="form-field__label">Item Name</label>
              <input [(ngModel)]="customName" placeholder="e.g., Blue Moroccan Tiles" />
            </div>

            <div class="form-field">
              <label class="form-field__label">Description</label>
              <textarea [(ngModel)]="customDesc" rows="3" placeholder="Describe the item in detail — style, color, material, dimensions..."></textarea>
            </div>

            <div class="form-field">
              <label class="form-field__label">Category</label>
              <select [(ngModel)]="customCategory">
                @for (cat of categories; track cat) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
            </div>

            <div class="form-field">
              <label class="form-field__label">Reference Image <span class="optional">(optional)</span></label>
              <div class="upload-zone" [class.upload-zone--has-image]="customImage">
                @if (customImage) {
                  <img [src]="customImage" alt="Preview" class="upload-preview" />
                  <button class="upload-remove" (click)="customImage=''; $event.stopPropagation()">×</button>
                } @else {
                  <app-web-scanner (imageSelected)="onWebImageScanned($event)"></app-web-scanner>
                  <div style="font-size:11px;color:#9aa0a6;margin-bottom:8px">or</div>
                  <button class="btn btn-secondary btn-sm" (click)="fileInput.click()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-right:6px">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Upload from computer
                  </button>
                  <span class="upload-hint" style="margin-top:6px;display:inline-block">Max 2MB, JPG or PNG</span>
                }
              </div>
              <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />

            </div>

            <div class="form-field">
              <label class="form-field__label">Tags <span class="optional">(optional, comma-separated)</span></label>
              <input [(ngModel)]="customTags" placeholder="blue, moroccan, handmade" />
            </div>

            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="showUpload.set(false)">Cancel</button>
              <button
                class="btn btn-primary"
                [disabled]="!customName.trim() || !customDesc.trim() || uploading()"
                (click)="submitCustom()"
              >
                @if (uploading()) {
                  <div class="spinner" style="width:16px;height:16px;border-width:2px;border-color:#fff3;border-top-color:#fff"></div>
                  Saving...
                } @else {
                  Add to My Collection
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .catalog { max-width: 1400px; margin: 0 auto; padding-top: 32px; }

    .catalog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px 8px 12px;
      font-size: 14px;
      font-weight: 500;
      color: #1a73e8;
      text-decoration: none;
      background: #e8f0fe;
      border-radius: 20px;
      margin-bottom: 8px;
      transition: background .15s, box-shadow .15s;
      &:hover { background: #d2e3fc; box-shadow: 0 1px 4px rgba(26,115,232,.2); }
    }
    .page-title {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: 26px;
      font-weight: 400;
      color: #202124;
      margin: 0 0 4px;
    }
    .page-subtitle { font-size: 14px; color: #5f6368; margin: 0; }

    /* ── Shop Strip ── */
    .shop-strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 16px;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }
    .shop-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1.5px solid #e8eaed;
      border-radius: 20px;
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: #3c4043;
      cursor: pointer;
      white-space: nowrap;
      transition: all .15s;
      &--active {
        border-color: #1a73e8;
        background: #e8f0fe;
        color: #1a73e8;
      }
      &:hover:not(.shop-chip--active) {
        border-color: #bdc1c6;
        background: #f8f9fa;
      }
    }
    .shop-emoji { font-size: 16px; }

    /* ── Filter Bar ── */
    .filter-bar {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .search-group {
      display: flex;
      flex: 1;
      min-width: 320px;
      max-width: 720px;
      align-items: center;
      background: #fff;
      border: 1.5px solid #dadce0;
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus-within {
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26,115,232,0.1);
      }
    }
    
    .domain-select-wrap {
      position: relative;
      border-right: 1px solid #e8eaed;
      background: #f8f9fa;
      height: 42px;
      display: flex;
      align-items: center;
      transition: background 0.15s;
      &:hover { background: #f1f3f4; }
      select {
        border: none;
        background: transparent;
        padding: 0 36px 0 16px;
        height: 100%;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        color: #3c4043;
        cursor: pointer;
        outline: none;
        appearance: none;
      }
      .select-arrow {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #5f6368;
      }
    }

    .search-wrap {
      position: relative;
      flex: 1;
      height: 42px;
      display: flex;
      align-items: center;
      .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: #9aa0a6;
      }
      input {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        padding-left: 40px;
        padding-right: 36px;
        font-size: 14px;
        color: #202124;
        outline: none;
        &::placeholder { color: #9aa0a6; }
      }
    }
    
    .search-action-btn {
      height: 42px;
      border-radius: 0;
      border: none;
      padding: 0 20px;
      font-weight: 500;
    }

    .search-clear {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 18px;
      color: #9aa0a6;
      cursor: pointer;
      padding: 4px;
      &:hover { color: #5f6368; }
    }
    .category-tabs {
      display: flex;
      gap: 4px;
    }
    .cat-tab {
      padding: 6px 14px;
      border: 1px solid #e8eaed;
      border-radius: 16px;
      background: #fff;
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
      cursor: pointer;
      transition: all .15s;
      &--active {
        border-color: #1a73e8;
        background: #e8f0fe;
        color: #1a73e8;
      }
      &:hover:not(.cat-tab--active) {
        background: #f8f9fa;
      }
    }

    .state-center { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; }
    .empty-state {
      max-width: 360px;
      margin: 0 auto;
      text-align: center;
      padding: 40px 24px;
    }
    .empty-title { font-size: 15px; font-weight: 500; color: #202124; margin: 0 0 6px; }
    .empty-sub { font-size: 13px; color: #5f6368; margin: 0; }

    /* ── Item Grid ── */
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 18px;
    }
    .item-card {
      padding: 0;
      overflow: hidden;
      transition: box-shadow .15s, border-color .15s;
      &:hover {
        border-color: #1a73e8;
        box-shadow: 0 2px 8px rgba(60,64,67,.12);
      }
    }
    .item-card__image {
      position: relative;
      aspect-ratio: 4/3;
      background: #f0f2f5;
      overflow: hidden;
      img {
        width: 100%; height: 100%;
        object-fit: cover;
        display: block;
      }
    }
    .item-card__overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,.8);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      opacity: 0;
      transition: opacity .2s;
    }
    .item-card:hover .item-card__overlay { opacity: 1; }
    .item-placeholder {
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f0f2f5 0%, #e8eaed 100%);
    }
    .item-placeholder__cat { font-size: 36px; }
    .item-badge {
      position: absolute;
      top: 8px; left: 8px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      background: rgba(0,0,0,.6);
      color: #fff;
      letter-spacing: .03em;
      &--custom {
        left: auto;
        right: 8px;
        background: #1a73e8;
      }
    }
    .item-card__body { padding: 12px 14px 8px; }
    .item-name {
      font-size: 13px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 4px;
      line-height: 1.3;
    }
    .item-desc {
      font-size: 11px;
      color: #5f6368;
      margin: 0 0 8px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .item-shop {
      font-size: 10px;
      font-weight: 500;
      color: #9aa0a6;
    }
    .item-tags {
      display: flex;
      gap: 4px;
      padding: 6px 14px 12px;
    }
    .tag {
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 10px;
      color: #5f6368;
      background: #f1f3f4;
    }
    .btn-danger-icon {
      color: #d93025;
      &:hover { background: #fce8e6; }
    }

    /* ── Upload Modal ── */
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
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      h2 {
        font-family: 'Google Sans','Roboto',sans-serif;
        font-size: 20px;
        font-weight: 400;
        color: #202124;
        margin: 0;
      }
    }
    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 24px;
      border: 2px dashed #dadce0;
      border-radius: 8px;
      cursor: pointer;
      transition: all .15s;
      position: relative;
      min-height: 100px;
      svg { color: #9aa0a6; }
      span { font-size: 13px; color: #5f6368; }
      &:hover {
        border-color: #1a73e8;
        background: #f8f9ff;
      }
      &--has-image {
        padding: 0;
        border-style: solid;
        border-color: #e8eaed;
      }
    }
    .upload-preview {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: 6px;
      display: block;
    }
    .upload-remove {
      position: absolute;
      top: 8px; right: 8px;
      width: 24px; height: 24px;
      background: rgba(0,0,0,.6);
      color: #fff;
      border: none;
      border-radius: 50%;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .upload-hint {
      font-size: 11px !important;
      color: #9aa0a6 !important;
    }
    .optional {
      font-size: 11px;
      color: #9aa0a6;
      font-weight: 400;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e8eaed;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .catalog-header {
        flex-direction: column;
        align-items: stretch;
        .btn { align-self: flex-start; }
      }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .search-group { max-width: 100%; min-width: 0; }
      .category-tabs { flex-wrap: wrap; }
      .items-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
      .modal { width: calc(100vw - 32px); margin: 16px; }
    }

    @media (max-width: 480px) {
      .items-grid { grid-template-columns: repeat(2, 1fr); }
      .shop-strip { gap: 6px; }
      .shop-chip { padding: 6px 12px; font-size: 12px; }
      .domain-select-wrap select { padding: 0 28px 0 10px; font-size: 12px; }
    }
  `,
})
export class CatalogBrowserComponent implements OnInit {
  shops = signal<Shop[]>([]);
  items = signal<CatalogItem[]>([]);
  loading = signal(false);
  activeShop = signal('');
  activeCategory = signal('');
  searchQuery = '';
  
  activeExternalDomain = signal('');
  externalDomains = [
    { label: 'Hatil', value: 'hatil.com' },
    { label: 'Akij Ceramics', value: 'akijceramics.com' },
    { label: 'RAK Ceramics', value: 'rakceramics.com' },
    { label: 'IKEA', value: 'ikea.com' },
    { label: 'Ashley Furniture', value: 'ashleyfurniture.com' },
    { label: 'CB2', value: 'cb2.com' },
  ];

  showUpload = signal(false);
  uploading = signal(false);
  customName = '';
  customDesc = '';
  customCategory: CatalogCategory = 'furniture';
  customImage = '';
  customImageUrl = '';
  customTags = '';

  categories = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'tiles', label: 'Tiles' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'decor', label: 'Decor' },
    { value: 'textiles', label: 'Textiles' },
    { value: 'surfaces', label: 'Surfaces' },
  ];

  private shopMap = new Map<string, string>();

  constructor(private catalogService: CatalogService, private router: Router) {}

  ngOnInit() {
    this.loadShops();
    this.loadItems();
  }

  async loadShops() {
    const shops = await firstValueFrom(this.catalogService.getShops());
    this.shops.set(shops);
    this.shopMap.clear();
    shops.forEach(s => this.shopMap.set(s.id, s.name));
    this.shopMap.set('my_collection', 'My Collection');
  }

  async triggerSearch() {
    if (this.activeExternalDomain()) {
      if (this.searchQuery.trim()) {
        await this.loadExternalItems();
      }
    } else {
      await this.loadItems();
    }
  }
  
  onSearchInput() {
    // Only auto-search while typing if we are on the Internal Catalog.
    // External proxy searches should only occur explicitly on Enter/Click to avoid spam.
    if (!this.activeExternalDomain()) {
      this.loadItems();
    }
  }
  
  clearSearch() {
    this.searchQuery = '';
    this.triggerSearch();
  }
  
  onDomainChange() {
    // When switching domains, if moving to internal, instantly reload.
    // If moving to external, wait for explicit query.
    if (!this.activeExternalDomain()) {
      this.loadItems();
    } else {
      this.items.set([]);
    }
  }

  async loadExternalItems() {
    this.loading.set(true);
    try {
      const items = await firstValueFrom(
        this.catalogService.searchExternalItems(this.activeExternalDomain(), this.searchQuery)
      );
      this.items.set(items);
    } catch (e) {
      console.error('Failed external search', e);
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async loadItems() {
    if (this.activeExternalDomain()) {
      if (!this.searchQuery.trim()) {
        this.items.set([]); // External proxy requires a search term
        return;
      }
      return this.triggerSearch();
    }

    this.loading.set(true);
    const items = await firstValueFrom(
      this.catalogService.searchItems(this.searchQuery, this.activeCategory())
    );
    // Filter by shop if selected
    const shop = this.activeShop();
    if (shop) {
      this.items.set(items.filter(i => i.shop_id === shop));
    } else {
      this.items.set(items);
    }
    this.loading.set(false);
  }

  async loadShopItems(shopId: string) {
    this.loading.set(true);
    try {
      const shop = await firstValueFrom(this.catalogService.getShop(shopId));
      let items = shop.items;
      const cat = this.activeCategory();
      if (cat) items = items.filter(i => i.category === cat);
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        items = items.filter(i =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
        );
      }
      this.items.set(items);
    } catch {
      this.items.set([]);
    }
    this.loading.set(false);
  }

  async addExternalItem(item: CatalogItem) {
    const req: CustomItemRequest = {
      name: item.name,
      description: item.description,
      category: 'furniture',
      image_base64: item.image_base64,
      tags: ['external', item.shop_id],
    };
    try {
      await firstValueFrom(this.catalogService.createCustomItem(req));
      alert(`Successfully saved ${item.name} to My Collection!`);
      // Optionally switch back to internal view to show it
      this.activeExternalDomain.set('');
      this.searchQuery = '';
      this.activeShop.set('my_collection');
      this.loadItems();
    } catch (e) {
      alert('Failed to save external item.');
    }
  }

  getShopName(shopId: string): string {
    return this.shopMap.get(shopId) ?? shopId;
  }

  getCategoryEmoji(cat: string): string {
    const map: Record<string, string> = {
      furniture: '🪑', tiles: '🧱', lighting: '💡',
      decor: '🖼️', textiles: '🧶', surfaces: '💎',
    };
    return map[cat] ?? '📦';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.customImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onWebImageScanned(url: string) {
    this.customImage = url;
  }

  async submitCustom() {
    this.uploading.set(true);
    const req: CustomItemRequest = {
      name: this.customName.trim(),
      description: this.customDesc.trim(),
      category: this.customCategory,
      image_base64: this.customImage,
      tags: this.customTags.split(',').map(t => t.trim()).filter(Boolean),
    };
    await firstValueFrom(this.catalogService.createCustomItem(req));
    // Reset form
    this.customName = '';
    this.customDesc = '';
    this.customCategory = 'furniture';
    this.customImage = '';
    this.customImageUrl = '';
    this.customTags = '';
    this.uploading.set(false);
    this.showUpload.set(false);
    // Reload
    this.loadShops();
    this.loadItems();
  }

  async deleteCustom(itemId: string) {
    await firstValueFrom(this.catalogService.deleteCustomItem(itemId));
    this.loadShops();
    if (this.activeShop()) {
      this.loadShopItems(this.activeShop());
    } else {
      this.loadItems();
    }
  }
}
