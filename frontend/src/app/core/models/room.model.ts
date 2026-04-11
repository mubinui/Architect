export type RoomType =
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'living_room'
  | 'dining_room'
  | 'office'
  | 'hallway'
  | 'balcony'
  | 'guest_room'
  | 'kids_room'
  | 'laundry'
  | 'closet';

export interface Dimensions {
  width: number;
  height: number;
  length: number;
}

export interface RoomSpec {
  id: string;
  name: string;
  room_type: RoomType;
  dimensions: Dimensions;
  color_preferences: string[];
  furniture_preferences: string[];
  selected_catalog_items: string[];
  notes: string;
}

export interface RoomResult {
  room_id: string;
  generated_prompt: string;
  image_base64: string;
  generation_number: number;
  modification_history: string[];
}
