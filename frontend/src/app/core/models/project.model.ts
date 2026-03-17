import { DesignContext } from './design-context.model';
import { RoomSpec, RoomResult } from './room.model';

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  design_context: DesignContext;
  rooms: RoomSpec[];
  results: Record<string, RoomResult>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  style: string;
  room_count: number;
  has_results: boolean;
}

export interface CreateProjectRequest {
  name: string;
  design_context: DesignContext;
  rooms: RoomSpec[];
}

export interface RoomGenerationResult {
  room_id: string;
  room_name: string;
  image_base64: string;
  generated_prompt: string;
  status: string;
  error?: string;
}

export interface GenerationResponse {
  project_id: string;
  results: RoomGenerationResult[];
  total: number;
  successful: number;
  failed: number;
}
