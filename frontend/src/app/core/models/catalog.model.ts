export type CatalogCategory = 'furniture' | 'tiles' | 'lighting' | 'decor' | 'textiles' | 'surfaces';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: CatalogCategory;
  shop_id: string;
  image_base64: string;
  tags: string[];
  is_custom: boolean;
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  logo_emoji: string;
  items: CatalogItem[];
}

export interface CustomItemRequest {
  name: string;
  description: string;
  category: CatalogCategory;
  image_base64: string;
  tags: string[];
}
