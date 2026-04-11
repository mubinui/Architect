import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Project,
  ProjectSummary,
  CreateProjectRequest,
  GenerationResponse,
  RoomGenerationResult,
} from '../models';
import { environment } from '../../../environments/environment';
import { RoomSpec } from '../models';
import { StyleOption } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Projects
  getProjects(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(`${this.baseUrl}/projects`);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${id}`);
  }

  createProject(req: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, req);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
  }

  // Rooms
  addRoom(projectId: string, room: RoomSpec): Observable<RoomSpec> {
    return this.http.post<RoomSpec>(
      `${this.baseUrl}/projects/${projectId}/rooms`,
      room
    );
  }

  updateRoom(
    projectId: string,
    roomId: string,
    room: RoomSpec
  ): Observable<RoomSpec> {
    return this.http.put<RoomSpec>(
      `${this.baseUrl}/projects/${projectId}/rooms/${roomId}`,
      room
    );
  }

  deleteRoom(projectId: string, roomId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/projects/${projectId}/rooms/${roomId}`
    );
  }

  // Generation
  generateAll(projectId: string): Observable<GenerationResponse> {
    return this.http.post<GenerationResponse>(
      `${this.baseUrl}/projects/${projectId}/generate`,
      {}
    );
  }

  generateRoom(
    projectId: string,
    roomId: string,
    referenceImages: string[] = [],
  ): Observable<RoomGenerationResult> {
    return this.http.post<RoomGenerationResult>(
      `${this.baseUrl}/projects/${projectId}/rooms/${roomId}/generate`,
      { reference_images: referenceImages }
    );
  }

  modifyRoom(
    projectId: string,
    roomId: string,
    modificationPrompt: string,
    referenceImages: string[] = [],
  ): Observable<RoomGenerationResult> {
    return this.http.post<RoomGenerationResult>(
      `${this.baseUrl}/projects/${projectId}/rooms/${roomId}/modify`,
      {
        modification_prompt: modificationPrompt,
        reference_images: referenceImages,
      }
    );
  }

  // Styles
  getStyles(): Observable<StyleOption[]> {
    return this.http.get<StyleOption[]>(`${this.baseUrl}/styles`);
  }

  // Scraper
  scanWebsite(url: string): Observable<{ images: string[] }> {
    return this.http.get<{ images: string[] }>(`${this.baseUrl}/scraper/scan?url=${encodeURIComponent(url)}`);
  }
}
