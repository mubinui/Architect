import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectStore } from '../../core/store/project.store';
import { ProjectSummary } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Projects</h1>
          <p class="page-subtitle">Manage your interior design projects</p>
        </div>
      </div>

      <!-- Loading -->
      @if (store.loading()) {
        <div class="state-center">
          <div class="spinner"></div>
        </div>
      }

      <!-- Empty -->
      @else if (store.projects().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#bdc1c6" stroke-width="1.5"/>
              <path d="M3 9H21" stroke="#bdc1c6" stroke-width="1.5"/>
              <path d="M9 21V9" stroke="#bdc1c6" stroke-width="1.5"/>
            </svg>
          </div>
          <p class="empty-title">No projects yet</p>
          <p class="empty-sub">Create a project to start designing your space</p>
          <a routerLink="/project/new" class="btn btn-primary">Create your first project</a>
        </div>
      }

      <!-- Grid -->
      @else {
        <div class="projects-grid">
          @for (p of store.projects(); track p.id) {
            <div class="project-card card" (click)="open(p)">
              <div class="project-card__header">
                <span class="badge badge--blue">{{ p.style.replace('_', ' ') }}</span>
                <button
                  class="btn btn-icon delete-btn"
                  title="Delete"
                  (click)="remove($event, p.id)"
                >
                  <!-- Trash icon -->
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                    <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6L18 20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20L5 6H19Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              <h3 class="project-card__name">{{ p.name }}</h3>
              <div class="project-card__meta">
                <span class="meta-item">
                  <!-- Rooms icon -->
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.75"/>
                    <path d="M3 12H21M12 3V21" stroke="currentColor" stroke-width="1.75"/>
                  </svg>
                  {{ p.room_count }} room{{ p.room_count !== 1 ? 's' : '' }}
                </span>
                <span class="meta-dot">·</span>
                @if (p.has_results) {
                  <span class="badge badge--green">Generated</span>
                } @else {
                  <span class="badge badge--yellow">Draft</span>
                }
              </div>
              <div class="project-card__date">
                Updated {{ formatDate(p.updated_at) }}
              </div>
            </div>
          }

          <!-- Create new card -->
          <a routerLink="/project/new" class="new-card card">
            <div class="new-card__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="#1a73e8" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="new-card__label">New Project</span>
          </a>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      padding: 32px 0;
    }
    .page-header {
      margin-bottom: 28px;
    }
    .page-title {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: 28px;
      font-weight: 400;
      color: #202124;
      margin: 0 0 4px;
    }
    .page-subtitle {
      font-size: 14px;
      color: #5f6368;
      margin: 0;
    }
    .state-center {
      display: flex;
      justify-content: center;
      padding: 64px;
    }
    .empty-state {
      max-width: 400px;
      margin: 0 auto;
      text-align: center;
      padding: 48px 32px;
    }
    .empty-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .empty-title {
      font-size: 16px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 8px;
    }
    .empty-sub {
      font-size: 14px;
      color: #5f6368;
      margin: 0 0 24px;
    }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      max-width: 1600px;
    }
    .project-card {
      cursor: pointer;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
      &:hover {
        border-color: #1a73e8;
        box-shadow: 0 1px 6px rgba(60,64,67,.15);
      }
    }
    .project-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .project-card__name {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 10px;
    }
    .project-card__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #5f6368;
      svg { color: #9aa0a6; }
    }
    .meta-dot { color: #bdc1c6; font-size: 12px; }
    .project-card__date {
      font-size: 11px;
      color: #9aa0a6;
    }
    .delete-btn {
      opacity: 0;
      transition: opacity 0.15s;
      .project-card:hover & { opacity: 1; }
    }
    .new-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 140px;
      border: 1.5px dashed #dadce0;
      text-decoration: none;
      transition: border-color 0.15s ease, background 0.15s ease;
      &:hover {
        border-color: #1a73e8;
        background: #f8f9ff;
      }
    }
    .new-card__icon {
      width: 40px; height: 40px;
      background: #e8f0fe;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .new-card__label {
      font-size: 14px;
      font-weight: 500;
      color: #1a73e8;
    }

    @media (max-width: 640px) {
      .projects-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class DashboardComponent implements OnInit {
  constructor(
    public store: ProjectStore,
    private router: Router
  ) {}

  ngOnInit() {
    this.store.loadProjects();
  }

  open(p: ProjectSummary) {
    this.router.navigate(['/project', p.id]);
  }

  async remove(e: Event, id: string) {
    e.stopPropagation();
    await this.store.deleteProject(id);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }
}
