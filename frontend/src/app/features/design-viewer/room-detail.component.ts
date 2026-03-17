import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/store/project.store';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
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
              <span class="meta-dim">{{ room()!.dimensions.width }}m × {{ room()!.dimensions.length }}m × {{ room()!.dimensions.height }}m ceiling</span>
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
                  <span>Generating design…</span>
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
                  <button class="btn btn-primary" (click)="regen()">Generate Design</button>
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

            <!-- Modify -->
            <div class="card control-card">
              <h3 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
                  <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                  <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Modify Design
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
                  Apply Modification
                }
              </button>
            </div>

            <!-- Room Details -->
            <div class="card control-card">
              <h3 class="section-title">Room Details</h3>
              @if (room()!.color_preferences.length) {
                <div class="detail-row">
                  <span class="detail-label">Colors</span>
                  <div class="chip-list">
                    @for (c of room()!.color_preferences; track c) {
                      <span class="chip">{{ c }}</span>
                    }
                  </div>
                </div>
              }
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
              @if (!room()!.color_preferences.length && !room()!.furniture_preferences.length && !room()!.notes) {
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

  constructor(public store: ProjectStore, private route: ActivatedRoute) {
    this.project = this.store.currentProject;
    this.room = computed(() => this.project()?.rooms.find(r => r.id === this.roomId) ?? null);
    this.result = computed(() => this.project()?.results[this.roomId] ?? null);
    this.status = computed(() => this.store.generationStatus().get(this.roomId) ?? 'idle');
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.roomId = this.route.snapshot.paramMap.get('roomId')!;
    if (!this.project() || this.project()?.id !== this.projectId) {
      this.store.loadProject(this.projectId);
    }
  }

  regen() { this.store.generateRoom(this.roomId); }

  async modify() {
    const p = this.modText.trim();
    if (!p) return;
    await this.store.modifyRoom(this.roomId, p);
    this.modText = '';
  }
}
