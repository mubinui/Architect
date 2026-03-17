import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from '../services/api.service';
import {
  Project,
  ProjectSummary,
  CreateProjectRequest,
  GenerationResponse,
  RoomGenerationResult,
} from '../models';
import { firstValueFrom } from 'rxjs';

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';

@Injectable({ providedIn: 'root' })
export class ProjectStore {
  readonly projects = signal<ProjectSummary[]>([]);
  readonly currentProject = signal<Project | null>(null);
  readonly generationStatus = signal<Map<string, GenerationStatus>>(new Map());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly currentRooms = computed(() => this.currentProject()?.rooms ?? []);
  readonly currentResults = computed(
    () => this.currentProject()?.results ?? {}
  );

  constructor(private api: ApiService) {}

  async loadProjects(): Promise<void> {
    this.loading.set(true);
    try {
      const projects = await firstValueFrom(this.api.getProjects());
      this.projects.set(projects);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async loadProject(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const project = await firstValueFrom(this.api.getProject(id));
      this.currentProject.set(project);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async createProject(req: CreateProjectRequest): Promise<Project> {
    const project = await firstValueFrom(this.api.createProject(req));
    this.currentProject.set(project);
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await firstValueFrom(this.api.deleteProject(id));
    this.projects.update((ps) => ps.filter((p) => p.id !== id));
    if (this.currentProject()?.id === id) {
      this.currentProject.set(null);
    }
  }

  async generateAll(): Promise<GenerationResponse | null> {
    const project = this.currentProject();
    if (!project) return null;

    // Set all rooms to generating
    const statusMap = new Map<string, GenerationStatus>();
    project.rooms.forEach((r) => statusMap.set(r.id, 'generating'));
    this.generationStatus.set(statusMap);

    try {
      const response = await firstValueFrom(
        this.api.generateAll(project.id)
      );

      // Update statuses
      const newMap = new Map<string, GenerationStatus>();
      response.results.forEach((r) => {
        newMap.set(r.room_id, r.status === 'success' ? 'done' : 'error');
      });
      this.generationStatus.set(newMap);

      // Reload project to get updated results
      await this.loadProject(project.id);
      return response;
    } catch (e: any) {
      const errorMap = new Map<string, GenerationStatus>();
      project.rooms.forEach((r) => errorMap.set(r.id, 'error'));
      this.generationStatus.set(errorMap);
      this.error.set(e.message);
      return null;
    }
  }

  async generateRoom(roomId: string): Promise<RoomGenerationResult | null> {
    const project = this.currentProject();
    if (!project) return null;

    this.generationStatus.update((m) => {
      const newMap = new Map(m);
      newMap.set(roomId, 'generating');
      return newMap;
    });

    try {
      const result = await firstValueFrom(
        this.api.generateRoom(project.id, roomId)
      );
      this.generationStatus.update((m) => {
        const newMap = new Map(m);
        newMap.set(roomId, 'done');
        return newMap;
      });
      await this.loadProject(project.id);
      return result;
    } catch (e: any) {
      this.generationStatus.update((m) => {
        const newMap = new Map(m);
        newMap.set(roomId, 'error');
        return newMap;
      });
      this.error.set(e.message);
      return null;
    }
  }

  async modifyRoom(
    roomId: string,
    prompt: string
  ): Promise<RoomGenerationResult | null> {
    const project = this.currentProject();
    if (!project) return null;

    this.generationStatus.update((m) => {
      const newMap = new Map(m);
      newMap.set(roomId, 'generating');
      return newMap;
    });

    try {
      const result = await firstValueFrom(
        this.api.modifyRoom(project.id, roomId, prompt)
      );
      this.generationStatus.update((m) => {
        const newMap = new Map(m);
        newMap.set(roomId, 'done');
        return newMap;
      });
      await this.loadProject(project.id);
      return result;
    } catch (e: any) {
      this.generationStatus.update((m) => {
        const newMap = new Map(m);
        newMap.set(roomId, 'error');
        return newMap;
      });
      this.error.set(e.message);
      return null;
    }
  }
}
