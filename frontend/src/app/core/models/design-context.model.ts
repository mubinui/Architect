export type DesignStyle =
  | 'modern'
  | 'minimalist'
  | 'industrial'
  | 'scandinavian'
  | 'bohemian'
  | 'traditional'
  | 'japandi'
  | 'mid_century_modern'
  | 'contemporary'
  | 'art_deco'
  | 'coastal'
  | 'rustic';

export interface DesignContext {
  style: DesignStyle;
  primary_colors: string[];
  accent_colors: string[];
  material_palette: string[];
  lighting_mood: string;
  texture_preferences: string[];
  overall_description: string;
}

export interface StyleOption {
  value: string;
  label: string;
}
