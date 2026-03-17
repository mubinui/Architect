import { Component, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectStore } from '../../core/store/project.store';

@Component({
  selector: 'app-design-viewer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="viewer">
      @if (store.loading()) {
        <div class="state-center"><div class="spinner"></div></div>
      }

      @else if (project()) {
        <!-- Page header -->
        <div class="page-header">
          <div class="page-title-row">
            <a routerLink="/" class="back-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
            <div>
              <h1 class="page-title">{{ project()!.name }}</h1>
              <div class="title-meta">
                <span class="badge badge--blue">{{ project()!.design_context.style.replace('_',' ') }}</span>
                <span class="meta-sep">·</span>
                <span class="meta-text">{{ project()!.rooms.length }} rooms</span>
              </div>
            </div>
          </div>
          <button
            class="btn btn-primary"
            [disabled]="isGenerating()"
            (click)="generateAll()"
          >
            @if (isGenerating()) {
              <div class="spinner" style="width:16px;height:16px;border-width:2px;border-color:#fff3;border-top-color:#fff"></div>
              Generating…
            } @else {
              <!-- Sparkle icon -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
                <path d="M19 15L19.75 17.25L22 18L19.75 18.75L19 21L18.25 18.75L16 18L18.25 17.25L19 15Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              Generate All
            }
          </button>
        </div>

        <!-- Design context summary -->
        @if (project()!.design_context.primary_colors.length || project()!.design_context.material_palette.length) {
          <div class="card context-bar">
            @if (project()!.design_context.primary_colors.length) {
              <div class="context-item">
                <span class="context-label">Colors</span>
                <span class="context-value">{{ project()!.design_context.primary_colors.join(', ') }}</span>
              </div>
            }
            @if (project()!.design_context.material_palette.length) {
              <div class="context-item">
                <span class="context-label">Materials</span>
                <span class="context-value">{{ project()!.design_context.material_palette.join(', ') }}</span>
              </div>
            }
            @if (project()!.design_context.lighting_mood) {
              <div class="context-item">
                <span class="context-label">Lighting</span>
                <span class="context-value">{{ project()!.design_context.lighting_mood }}</span>
              </div>
            }
          </div>
        }

        <!-- Room grid -->
        <div class="rooms-grid">
          @for (room of project()!.rooms; track room.id) {
            @let result = project()!.results[room.id];
            @let status = store.generationStatus().get(room.id);

            <div class="room-card card" (click)="goToRoom(room.id)">
              <div class="room-card__image">
                @if (status === 'generating') {
                  <div class="image-state">
                    <div class="spinner"></div>
                    <span>Generating…</span>
                  </div>
                } @else if (result) {
                  <img [src]="result.image_base64" [alt]="room.name" />
                } @else {
                  <div class="image-state image-state--empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#dadce0" stroke-width="1.5"/>
                      <path d="M3 16L8 11L11 14L15 9L21 16" stroke="#dadce0" stroke-width="1.5" stroke-linejoin="round"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="#dadce0"/>
                    </svg>
                    <span>Not generated</span>
                  </div>
                }
              </div>

              <div class="room-card__info">
                <div class="room-card__left">
                  <span class="room-name">{{ room.name }}</span>
                  <span class="room-type">{{ room.room_type.replace('_', ' ') }}</span>
                </div>
                <span class="room-dims">{{ room.dimensions.width }}×{{ room.dimensions.length }}m</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .state-center { display:flex; justify-content:center; padding:80px; }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .page-title-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px; height: 36px;
      border-radius: 50%;
      color: #5f6368;
      text-decoration: none;
      margin-top: 2px;
      transition: background .15s;
      &:hover { background: #f1f3f4; color: #202124; }
    }
    .page-title {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
      margin: 0 0 6px;
    }
    .title-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-sep { color: #bdc1c6; }
    .meta-text { font-size: 13px; color: #5f6368; }

    .context-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      padding: 14px 20px;
      margin-bottom: 24px;
    }
    .context-item { display:flex; flex-direction:column; gap:2px; }
    .context-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9aa0a6;
    }
    .context-value { font-size: 13px; color: #3c4043; }

    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .room-card {
      cursor: pointer;
      padding: 0;
      overflow: hidden;
      transition: box-shadow .15s, border-color .15s;
      &:hover {
        border-color: #1a73e8;
        box-shadow: 0 2px 8px rgba(60,64,67,.15);
      }
    }
    .room-card__image {
      aspect-ratio: 16/10;
      overflow: hidden;
      background: #f8f9fa;
      img {
        width: 100%; height: 100%;
        object-fit: cover;
        display: block;
        transition: transform .3s ease;
        .room-card:hover & { transform: scale(1.04); }
      }
    }
    .image-state {
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #1a73e8;
      span { font-size: 12px; font-weight: 500; }
      &--empty {
        color: #9aa0a6;
        span { font-size: 12px; font-weight: 400; }
      }
    }
    .room-card__info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
    }
    .room-card__left { display:flex; flex-direction:column; gap:2px; }
    .room-name { font-size: 14px; font-weight: 500; color: #202124; }
    .room-type { font-size: 12px; color: #5f6368; text-transform: capitalize; }
    .room-dims { font-size: 12px; color: #9aa0a6; }
  `,
})
export class DesignViewerComponent implements OnInit {
  project;
  isGenerating;

  constructor(
    public store: ProjectStore,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.project = this.store.currentProject;
    this.isGenerating = computed(() =>
      Array.from(this.store.generationStatus().values()).some(s => s === 'generating')
    );
  }

  ngOnInit() {
    this.store.loadProject(this.route.snapshot.paramMap.get('id')!);
  }

  generateAll() { this.store.generateAll(); }

  goToRoom(roomId: string) {
    this.router.navigate(['/project', this.project()?.id, 'room', roomId]);
  }
}
