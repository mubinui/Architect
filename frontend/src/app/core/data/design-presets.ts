export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  description: string;
  promptKeywords: string;
}

export interface MoodPreset {
  id: string;
  name: string;
  icon: string; // SVG path
  description: string;
  promptKeywords: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'warm_earth',
    name: 'Warm Earth',
    colors: ['#D4A574', '#8B6F47', '#E8D5B7', '#5C4033'],
    description: 'Rich browns, warm beiges & terracotta',
    promptKeywords: 'warm earth tones, terracotta, caramel brown, warm beige, sand',
  },
  {
    id: 'cool_ocean',
    name: 'Cool Ocean',
    colors: ['#5B8FA8', '#B8D4E3', '#2C5F7C', '#E0EEF5'],
    description: 'Calming blues, soft teals & seafoam',
    promptKeywords: 'ocean blue, soft teal, seafoam, coastal blue, calm aqua',
  },
  {
    id: 'neutral_classic',
    name: 'Neutral Classic',
    colors: ['#E8E4DF', '#B8B3AC', '#6B6560', '#F5F3F0'],
    description: 'Timeless grays, warm whites & stone',
    promptKeywords: 'warm white, soft gray, greige, stone, off-white, linen',
  },
  {
    id: 'bold_modern',
    name: 'Bold Modern',
    colors: ['#1A1A2E', '#E94560', '#16213E', '#F0E6D3'],
    description: 'Deep navy, dramatic reds & cream',
    promptKeywords: 'deep navy, bold crimson, cream, dramatic contrast, charcoal',
  },
  {
    id: 'soft_pastels',
    name: 'Soft Pastels',
    colors: ['#F2D7D9', '#D4E7C5', '#BFD8E8', '#F5E6CC'],
    description: 'Gentle pinks, sage greens & powder blue',
    promptKeywords: 'blush pink, sage green, powder blue, lavender, soft peach',
  },
  {
    id: 'dark_luxury',
    name: 'Dark Luxury',
    colors: ['#2C2C2C', '#8B7355', '#1A1A1A', '#C4A77D'],
    description: 'Rich blacks, burnished gold & walnut',
    promptKeywords: 'matte black, burnished gold, dark walnut, charcoal, bronze',
  },
  {
    id: 'forest_green',
    name: 'Forest & Green',
    colors: ['#2D5016', '#8FBC8F', '#F0E68C', '#4A7C59'],
    description: 'Deep greens, olive & golden accents',
    promptKeywords: 'forest green, olive, emerald, golden brass, deep moss',
  },
  {
    id: 'scandinavian_white',
    name: 'Nordic White',
    colors: ['#FAFAFA', '#E0D5C1', '#9DAFB2', '#C4B8A5'],
    description: 'Crisp whites, light wood & pale blue',
    promptKeywords: 'crisp white, light birch wood, pale blue-gray, natural linen',
  },
];

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'cozy_warm',
    name: 'Cozy & Warm',
    icon: `<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
    description: 'Warm lighting, soft textures, inviting atmosphere',
    promptKeywords: 'warm ambient lighting, 2700K color temperature, soft textiles, cozy atmosphere, layered lighting',
  },
  {
    id: 'bright_airy',
    name: 'Bright & Airy',
    icon: `<path d="M17 6C17 3.24 14.76 1 12 1S7 3.24 7 6C4.24 6 2 8.24 2 11s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 19H17M9 23H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
    description: 'Natural light, open feel, clean & spacious',
    promptKeywords: 'bright natural daylight, large windows, airy open space, sunlit, fresh atmosphere',
  },
  {
    id: 'dark_moody',
    name: 'Dark & Moody',
    icon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
    description: 'Dramatic shadows, rich tones, intimate feel',
    promptKeywords: 'moody dramatic lighting, deep shadows, intimate atmosphere, accent spotlights, rich dark tones',
  },
  {
    id: 'natural_organic',
    name: 'Natural & Organic',
    icon: `<path d="M6 21C6 21 9 15 12 12C15 9 21 6 21 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M12 12C12 12 7 11 4 14C1 17 3 21 3 21" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
    description: 'Plant-filled, wooden textures, earthy vibes',
    promptKeywords: 'natural materials, indoor plants, organic textures, warm wood grain, natural light filtering through greenery',
  },
  {
    id: 'sleek_clean',
    name: 'Sleek & Clean',
    icon: `<rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="3" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/>`,
    description: 'Minimalist, sharp lines, polished surfaces',
    promptKeywords: 'clean minimalist aesthetic, sharp geometric lines, polished surfaces, recessed lighting, uncluttered spaces',
  },
  {
    id: 'luxurious',
    name: 'Luxurious & Elegant',
    icon: `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
    description: 'Premium materials, statement pieces, opulent',
    promptKeywords: 'luxurious premium materials, statement chandelier, velvet upholstery, marble accents, gold hardware, opulent details',
  },
];
