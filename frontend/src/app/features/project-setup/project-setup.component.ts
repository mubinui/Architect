import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/store/project.store';
import {
  DesignStyle,
  DesignContext,
  RoomSpec,
  RoomType,
  CreateProjectRequest,
} from '../../core/models';

interface RoomForm {
  name: string;
  room_type: RoomType;
  width: number;
  height: number;
  length: number;
  colorInput: string;
  colors: string[];
  furnitureInput: string;
  furniture: string[];
  notes: string;
}

const STYLE_ICONS: Record<string, string> = {
  modern: `<path d="M3 9L12 2L21 9V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
  minimalist: `<rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>`,
  industrial: `<path d="M2 20L6 4H18L22 20H2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/>`,
  scandinavian: `<path d="M12 3L4 8V20H20V8L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><rect x="9" y="15" width="6" height="5" stroke="currentColor" stroke-width="1.5"/>`,
  bohemian: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/>`,
  traditional: `<path d="M4 21V10L12 3L20 10V21H4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 21V15H15V21" stroke="currentColor" stroke-width="1.5"/>`,
  japandi: `<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/>`,
  mid_century_modern: `<path d="M3 17C3 17 6 10 12 10C18 10 21 17 21 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 17V20M17 17V20M5 17H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  contemporary: `<path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  art_deco: `<polygon points="12,3 21,8 21,16 12,21 3,16 3,8" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  coastal: `<path d="M2 17C6 13 10 17 14 13C18 9 20 13 22 11" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/><path d="M2 21H22" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  rustic: `<rect x="3" y="8" width="18" height="13" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M3 8L12 3L21 8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
};

@Component({
  selector: 'app-project-setup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="setup">
      <!-- Breadcrumb / Stepper -->
      <div class="setup-nav">
        <a routerLink="/" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Projects
        </a>
        <div class="stepper">
          @for (s of steps; track s; let i = $index) {
            <div class="step-item" [class.active]="step() === i" [class.done]="step() > i">
              <div class="step-dot">{{ step() > i ? '✓' : i + 1 }}</div>
              <span class="step-label">{{ s }}</span>
            </div>
            @if (i < steps.length - 1) {
              <div class="step-line"></div>
            }
          }
        </div>
      </div>

      <!-- ── Step 0: Design Style ── -->
      @if (step() === 0) {
        <div class="step-panel">
          <div class="step-header">
            <h2>Design Style</h2>
            <p>Choose the visual language for your project</p>
          </div>

          <div class="form-field">
            <label class="form-field__label">Project Name</label>
            <input [(ngModel)]="projectName" placeholder="My Dream Apartment" />
          </div>

          <label class="form-field__label">Style</label>
          <div class="style-grid">
            @for (s of styles; track s) {
              <button
                type="button"
                class="style-tile"
                [class.style-tile--active]="selectedStyle === s"
                (click)="selectedStyle = s"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" [innerHTML]="styleIcon(s)"></svg>
                <span>{{ s.replace('_', ' ') }}</span>
              </button>
            }
          </div>

          <div class="divider"></div>

          <div class="form-row">
            <div class="form-field">
              <label class="form-field__label">Primary Colors</label>
              <input [(ngModel)]="primaryColors" placeholder="warm white, oak brown, soft gray" />
            </div>
            <div class="form-field">
              <label class="form-field__label">Accent Colors</label>
              <input [(ngModel)]="accentColors" placeholder="brushed gold, forest green" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label class="form-field__label">Material Palette</label>
              <input [(ngModel)]="materials" placeholder="light oak, marble, brushed brass" />
            </div>
            <div class="form-field">
              <label class="form-field__label">Lighting Mood</label>
              <input [(ngModel)]="lightingMood" placeholder="warm ambient with accent spotlights" />
            </div>
          </div>
          <div class="form-field">
            <label class="form-field__label">Texture Preferences</label>
            <input [(ngModel)]="textures" placeholder="linen, matte concrete, natural wood grain" />
          </div>
          <div class="form-field">
            <label class="form-field__label">Overall Vision (optional)</label>
            <textarea [(ngModel)]="overallDescription" placeholder="A cozy modern apartment with warm earth tones..."></textarea>
          </div>

          <div class="step-actions">
            <button class="btn btn-primary" [disabled]="!projectName.trim() || !selectedStyle" (click)="step.set(1)">
              Continue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      }

      <!-- ── Step 1: Rooms ── -->
      @if (step() === 1) {
        <div class="step-panel">
          <div class="step-header">
            <h2>Rooms</h2>
            <p>Define each room in your space</p>
          </div>

          @for (room of rooms; track $index; let i = $index) {
            <div class="room-card card">
              <div class="room-card-header">
                <div class="room-card-title">
                  <div class="room-number">{{ i + 1 }}</div>
                  <span class="room-card-name">{{ room.name || 'Untitled Room' }}</span>
                </div>
                @if (rooms.length > 1) {
                  <button class="btn btn-icon" title="Remove room" (click)="removeRoom(i)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                    </svg>
                  </button>
                }
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label class="form-field__label">Room Name</label>
                  <input [(ngModel)]="room.name" placeholder="Master Bedroom" />
                </div>
                <div class="form-field">
                  <label class="form-field__label">Room Type</label>
                  <select [(ngModel)]="room.room_type">
                    @for (t of roomTypes; track t) {
                      <option [value]="t">{{ t.replace('_', ' ') }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row form-row--3">
                <div class="form-field">
                  <label class="form-field__label">Width (m)</label>
                  <input type="number" [(ngModel)]="room.width" min="1" step="0.5" />
                </div>
                <div class="form-field">
                  <label class="form-field__label">Length (m)</label>
                  <input type="number" [(ngModel)]="room.length" min="1" step="0.5" />
                </div>
                <div class="form-field">
                  <label class="form-field__label">Ceiling (m)</label>
                  <input type="number" [(ngModel)]="room.height" min="2" step="0.1" />
                </div>
              </div>

              <div class="form-field">
                <label class="form-field__label">Colors</label>
                <div class="chip-input">
                  @for (c of room.colors; track c; let ci = $index) {
                    <span class="chip">{{ c }}<span class="chip__remove" (click)="room.colors.splice(ci,1)">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </span></span>
                  }
                  <input [(ngModel)]="room.colorInput" placeholder="warm white…" (keydown.enter)="addTag(room,'colors',room.colorInput);room.colorInput=''" />
                </div>
              </div>

              <div class="form-field">
                <label class="form-field__label">Furniture</label>
                <div class="chip-input">
                  @for (f of room.furniture; track f; let fi = $index) {
                    <span class="chip">{{ f }}<span class="chip__remove" (click)="room.furniture.splice(fi,1)">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </span></span>
                  }
                  <input [(ngModel)]="room.furnitureInput" placeholder="king bed…" (keydown.enter)="addTag(room,'furniture',room.furnitureInput);room.furnitureInput=''" />
                </div>
              </div>

              <div class="form-field">
                <label class="form-field__label">Notes</label>
                <textarea [(ngModel)]="room.notes" placeholder="Any special requirements..."></textarea>
              </div>
            </div>
          }

          <button class="add-room-btn" (click)="addRoom()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Add Another Room
          </button>

          <div class="step-actions">
            <button class="btn btn-secondary" (click)="step.set(0)">Back</button>
            <button class="btn btn-primary" [disabled]="!roomsValid()" (click)="step.set(2)">
              Continue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      }

      <!-- ── Step 2: Review ── -->
      @if (step() === 2) {
        <div class="step-panel">
          <div class="step-header">
            <h2>Review & Create</h2>
            <p>Confirm your project details before generating</p>
          </div>

          <div class="review-block card">
            <div class="review-row">
              <span class="review-label">Project</span>
              <span class="review-value">{{ projectName }}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Style</span>
              <span class="badge badge--blue">{{ selectedStyle.replace('_',' ') }}</span>
            </div>
            @if (primaryColors) {
              <div class="review-row">
                <span class="review-label">Colors</span>
                <span class="review-value">{{ primaryColors }}</span>
              </div>
            }
            @if (materials) {
              <div class="review-row">
                <span class="review-label">Materials</span>
                <span class="review-value">{{ materials }}</span>
              </div>
            }
          </div>

          <h3 class="section-title" style="margin-top:24px">{{ rooms.length }} Room{{ rooms.length !== 1 ? 's' : '' }}</h3>
          @for (r of rooms; track $index; let i = $index) {
            <div class="review-room card">
              <div class="review-room-header">
                <div class="room-number">{{ i + 1 }}</div>
                <div>
                  <strong>{{ r.name }}</strong>
                  <span class="badge badge--gray" style="margin-left:8px">{{ r.room_type.replace('_',' ') }}</span>
                </div>
                <span class="review-dims">{{ r.width }}m × {{ r.length }}m × {{ r.height }}m</span>
              </div>
            </div>
          }

          <div class="step-actions">
            <button class="btn btn-secondary" (click)="step.set(1)">Back</button>
            <button class="btn btn-primary" [disabled]="creating()" (click)="submit()">
              @if (creating()) {
                <div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
                Creating...
              } @else {
                Create Project
              }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .setup { max-width: 760px; }

    .setup-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #1a73e8;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .step-dot {
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #e8eaed;
      color: #5f6368;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      .step-item.active & { background: #1a73e8; color: #fff; }
      .step-item.done & { background: #137333; color: #fff; }
    }
    .step-label {
      font-size: 12px;
      color: #5f6368;
      .step-item.active & { color: #1a73e8; font-weight: 500; }
      .step-item.done & { color: #137333; }
    }
    .step-line {
      width: 32px; height: 1px;
      background: #e8eaed;
      margin: 0 4px;
    }

    .step-header {
      margin-bottom: 24px;
      h2 {
        font-family: 'Google Sans', 'Roboto', sans-serif;
        font-size: 22px;
        font-weight: 400;
        color: #202124;
        margin: 0 0 4px;
      }
      p { font-size: 14px; color: #5f6368; margin: 0; }
    }

    .style-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 10px;
      margin-bottom: 4px;
    }
    .style-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      background: #fff;
      border: 1px solid #e8eaed;
      border-radius: 8px;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      svg { color: #9aa0a6; }
      span {
        font-size: 11px;
        color: #5f6368;
        text-transform: capitalize;
        text-align: center;
        font-weight: 500;
      }
      &--active {
        border-color: #1a73e8;
        background: #f0f4ff;
        svg { color: #1a73e8; }
        span { color: #1a73e8; }
      }
      &:hover:not(.style-tile--active) {
        border-color: #bdc1c6;
        background: #f8f9fa;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      &--3 { grid-template-columns: 1fr 1fr 1fr; }
    }

    .room-card {
      margin-bottom: 16px;
    }
    .room-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .room-card-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .room-number {
      width: 24px; height: 24px;
      background: #1a73e8;
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .room-card-name {
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }

    .chip-input {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      background: #fff;
      min-height: 40px;
      transition: border-color .15s, box-shadow .15s;
      &:focus-within {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26,115,232,.15);
      }
      input {
        flex: 1;
        min-width: 100px;
        border: none;
        outline: none;
        font-size: 14px;
        color: #202124;
        background: transparent;
        height: 26px;
        padding: 0;
        &::placeholder { color: #bdc1c6; }
      }
    }

    .add-room-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 40px;
      justify-content: center;
      background: #fff;
      border: 1.5px dashed #dadce0;
      border-radius: 8px;
      color: #1a73e8;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 24px;
      transition: border-color .15s, background .15s;
      &:hover { border-color: #1a73e8; background: #f8f9ff; }
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e8eaed;
    }

    .review-block {
      margin-bottom: 8px;
    }
    .review-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid #f1f3f4;
      &:last-child { border-bottom: none; }
    }
    .review-label {
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      width: 80px;
      flex-shrink: 0;
    }
    .review-value {
      font-size: 14px;
      color: #202124;
    }
    .review-room {
      margin-bottom: 8px;
      padding: 14px 20px;
    }
    .review-room-header {
      display: flex;
      align-items: center;
      gap: 12px;
      strong { font-size: 14px; color: #202124; }
    }
    .review-dims {
      margin-left: auto;
      font-size: 12px;
      color: #9aa0a6;
    }
  `,
})
export class ProjectSetupComponent {
  step = signal(0);
  creating = signal(false);

  steps = ['Style', 'Rooms', 'Review'];

  projectName = '';
  selectedStyle: DesignStyle = 'modern';
  primaryColors = '';
  accentColors = '';
  materials = '';
  lightingMood = '';
  textures = '';
  overallDescription = '';

  rooms: RoomForm[] = [this.blankRoom()];

  styles: DesignStyle[] = [
    'modern','minimalist','industrial','scandinavian','bohemian',
    'traditional','japandi','mid_century_modern','contemporary',
    'art_deco','coastal','rustic',
  ];

  roomTypes: RoomType[] = [
    'bedroom','kitchen','bathroom','living_room','dining_room',
    'office','hallway','balcony','guest_room','kids_room','laundry','closet',
  ];

  constructor(private store: ProjectStore, private router: Router) {}

  styleIcon(s: string): string {
    return STYLE_ICONS[s] ?? STYLE_ICONS['modern'];
  }

  blankRoom(): RoomForm {
    return { name:'', room_type:'bedroom', width:4, height:3, length:5,
             colorInput:'', colors:[], furnitureInput:'', furniture:[], notes:'' };
  }

  addRoom() { this.rooms.push(this.blankRoom()); }
  removeRoom(i: number) { this.rooms.splice(i, 1); }

  addTag(room: RoomForm, field: 'colors'|'furniture', value: string) {
    const v = value.trim();
    if (v && !room[field].includes(v)) room[field].push(v);
  }

  roomsValid(): boolean {
    return this.rooms.every(r => r.name.trim() && r.width > 0 && r.length > 0 && r.height > 0);
  }

  private list(s: string): string[] {
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }

  async submit() {
    this.creating.set(true);
    const ctx: DesignContext = {
      style: this.selectedStyle,
      primary_colors: this.list(this.primaryColors),
      accent_colors: this.list(this.accentColors),
      material_palette: this.list(this.materials),
      lighting_mood: this.lightingMood,
      texture_preferences: this.list(this.textures),
      overall_description: this.overallDescription,
    };
    const roomSpecs: RoomSpec[] = this.rooms.map(r => ({
      id: crypto.randomUUID(),
      name: r.name,
      room_type: r.room_type,
      dimensions: { width: r.width, height: r.height, length: r.length },
      color_preferences: r.colors,
      furniture_preferences: r.furniture,
      notes: r.notes,
    }));
    const req: CreateProjectRequest = { name: this.projectName, design_context: ctx, rooms: roomSpecs };
    try {
      const project = await this.store.createProject(req);
      this.router.navigate(['/project', project.id]);
    } catch {
      this.creating.set(false);
    }
  }
}
