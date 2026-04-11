/** Structural element presets (always available in toolbar) */
export interface StructuralPreset {
  type: string;
  label: string;
  icon: string; // SVG path content for 24x24 viewBox
  w: number;
  h: number;
}

export const STRUCTURAL_PRESETS: StructuralPreset[] = [
  {
    type: 'wall',
    label: 'Wall',
    icon: '<rect x="4" y="2" width="16" height="20" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.3"/><rect x="4" y="2" width="16" height="20" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    w: 20,
    h: 120,
  },
  {
    type: 'door',
    label: 'Door',
    icon: '<rect x="4" y="8" width="16" height="8" rx="0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="3 2"/><path d="M4 16 Q4 8, 12 8" stroke="currentColor" stroke-width="1" fill="none" stroke-dasharray="2 2"/>',
    w: 60,
    h: 20,
  },
  {
    type: 'window',
    label: 'Window',
    icon: '<rect x="3" y="8" width="18" height="8" rx="0" stroke="currentColor" stroke-width="2" fill="none"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1"/>',
    w: 80,
    h: 15,
  },
];

/** Default pixel sizes for furniture preset IDs from furniture-presets.ts */
export const FURNITURE_SIZES: Record<string, { w: number; h: number }> = {
  // Bedroom
  king_bed:       { w: 120, h: 160 },
  queen_bed:      { w: 100, h: 140 },
  nightstand:     { w: 40,  h: 40  },
  dresser:        { w: 100, h: 40  },
  wardrobe:       { w: 80,  h: 50  },
  desk:           { w: 100, h: 50  },
  chair:          { w: 40,  h: 40  },
  mirror:         { w: 40,  h: 60  },
  rug:            { w: 120, h: 80  },
  floor_lamp:     { w: 30,  h: 30  },
  bookshelf:      { w: 80,  h: 30  },
  plants:         { w: 30,  h: 30  },

  // Living room
  sofa:           { w: 160, h: 60  },
  coffee_table:   { w: 80,  h: 50  },
  tv_unit:        { w: 140, h: 35  },
  armchair:       { w: 60,  h: 60  },
  side_table:     { w: 40,  h: 40  },
  curtains:       { w: 100, h: 15  },

  // Kitchen
  dining_table:   { w: 120, h: 80  },
  dining_chairs:  { w: 40,  h: 40  },
  kitchen_island: { w: 140, h: 60  },
  bar_stools:     { w: 30,  h: 30  },
  pantry_shelf:   { w: 80,  h: 30  },
  pendant_lights: { w: 30,  h: 30  },

  // Bathroom
  bathtub:        { w: 70,  h: 140 },
  vanity:         { w: 80,  h: 40  },
  mirror_large:   { w: 60,  h: 15  },
  towel_rack:     { w: 60,  h: 15  },
  shower_glass:   { w: 80,  h: 80  },

  // Office
  office_chair:   { w: 45,  h: 45  },
  monitor:        { w: 50,  h: 15  },
  desk_lamp:      { w: 25,  h: 25  },
  filing_cabinet: { w: 40,  h: 40  },

  // Dining room
  buffet:         { w: 120, h: 40  },
  chandelier:     { w: 40,  h: 40  },
};

export const DEFAULT_FURNITURE_SIZE = { w: 60, h: 60 };

/** Lookup furniture size by preset ID */
export function getFurnitureSize(id: string): { w: number; h: number } {
  return FURNITURE_SIZES[id] ?? DEFAULT_FURNITURE_SIZE;
}
