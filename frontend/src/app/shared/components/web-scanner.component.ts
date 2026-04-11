import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-web-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scanner-container">
      <div class="scanner-header">
        <input 
          type="text" 
          [(ngModel)]="url" 
          placeholder="Paste store/website URL to scan for images..."
          (keyup.enter)="scan()"
        />
        <button class="btn btn-primary" [disabled]="!url.trim() || scanning" (click)="scan()">
          @if (scanning) {
            <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
            Scanning...
          } @else {
            Scan Site
          }
        </button>
      </div>
      
      @if (error) {
        <div class="scanner-error">{{ error }}</div>
      }
      
      @if (images.length > 0) {
        <div class="scanner-results">
          <p class="results-title">Select an image to import ({{ images.length }} found):</p>
          <div class="images-grid">
            @for (img of images; track img) {
              <div class="image-box" (click)="selectImage(img)">
                <img [src]="img" alt="Scanned" loading="lazy" (error)="handleImageError(img)" />
              </div>
            }
          </div>
        </div>
      } @else if (hasScanned && !scanning) {
        <div class="scanner-error">No images could be extracted from this URL. Try a direct image URL instead.</div>
      }
    </div>
  `,
  styles: `
    .scanner-container {
      border: 1px solid #e8eaed;
      border-radius: 8px;
      padding: 16px;
      background: #f8f9fa;
      margin-bottom: 16px;
    }
    .scanner-header {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #dadce0;
        border-radius: 6px;
        font-size: 13px;
      }
    }
    .scanner-error {
      color: #d93025;
      font-size: 12px;
      margin-bottom: 12px;
      padding: 8px;
      background: #fce8e6;
      border-radius: 4px;
    }
    .results-title {
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
      margin: 0 0 10px;
    }
    .images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 8px;
      
      &::-webkit-scrollbar { width: 6px; }
      &::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 4px; }
    }
    .image-box {
      aspect-ratio: 1;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid transparent;
      cursor: pointer;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      
      &:hover {
        border-color: #1a73e8;
        transform: scale(1.02);
      }
    }
  `
})
export class WebScannerComponent {
  @Output() imageSelected = new EventEmitter<string>();
  
  url = '';
  scanning = false;
  hasScanned = false;
  error = '';
  images: string[] = [];

  constructor(private api: ApiService) {}

  async scan() {
    if (!this.url.trim()) return;
    
    // Quick check if input is already a direct image
    if (this.url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i) != null) {
      this.imageSelected.emit(this.url.trim());
      this.url = '';
      return;
    }

    this.scanning = true;
    this.hasScanned = true;
    this.error = '';
    this.images = [];
    
    try {
      const response = await firstValueFrom(this.api.scanWebsite(this.url));
      this.images = response.images;
    } catch (e: any) {
      this.error = e.error?.detail || 'Failed to scan website. It might be blocking automated requests.';
    } finally {
      this.scanning = false;
    }
  }

  selectImage(imgUrl: string) {
    this.imageSelected.emit(imgUrl);
    // Reset state after selection
    this.images = [];
    this.hasScanned = false;
    this.url = '';
  }

  handleImageError(imgUrl: string) {
    // Remove broken images from the list
    this.images = this.images.filter(url => url !== imgUrl);
  }
}
