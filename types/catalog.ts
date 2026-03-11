export interface CatalogCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isSystem: boolean;
  isUniversal: boolean;
  suggestedGarmentTypes: string[] | null;
  sortOrder: number;
  enabled: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  code: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  properties: Record<string, unknown> | null;
  garmentTypeIds: string[] | null;
  isSystem: boolean;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCategoryListResponse {
  categories: CatalogCategory[];
  total: number;
}

export interface CatalogItemListResponse {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCatalogCategoryRequest {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  isUniversal?: boolean;
  suggestedGarmentTypes?: string[];
  sortOrder?: number;
}

export interface UpdateCatalogCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
  isUniversal?: boolean;
  suggestedGarmentTypes?: string[];
  sortOrder?: number;
  enabled?: boolean;
}

export interface CreateCatalogItemRequest {
  categoryId: string;
  name: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  properties?: Record<string, unknown>;
  garmentTypeIds?: string[];
  sortOrder?: number;
}

export interface UpdateCatalogItemRequest {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  color?: string | null;
  properties?: Record<string, unknown> | null;
  garmentTypeIds?: string[] | null;
  sortOrder?: number;
  enabled?: boolean;
}

export const CATALOG_ICONS: Record<string, string> = {
  fabrics: 'Layers',
  buttons: 'Circle',
  lapels: 'TriangleRight',
  pockets: 'Square',
  collars: 'Shirt',
  cuffs: 'Minus',
  vents: 'SplitVertical',
  linings: 'Layers2',
  closures: 'Link',
  threads: 'Scissors',
};

// ============ GARMENT-SPECIFIC CATALOG TYPES ============

export interface GarmentCatalogCategory {
  id: string;
  garmentTypeId: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  enabled: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GarmentCatalogItem {
  id: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  code: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  properties: Record<string, unknown> | null;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GarmentCatalogCategoryListResponse {
  categories: GarmentCatalogCategory[];
  total: number;
}

export interface GarmentCatalogItemListResponse {
  items: GarmentCatalogItem[];
  total: number;
}

export interface GarmentCatalogCategoryWithItems extends GarmentCatalogCategory {
  items: GarmentCatalogItem[];
}

export interface GarmentCatalogResponse {
  categories: GarmentCatalogCategoryWithItems[];
  total: number;
}

export interface CreateGarmentCatalogCategoryRequest {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateGarmentCatalogCategoryRequest {
  name?: string;
  code?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  enabled?: boolean;
}

export interface CreateGarmentCatalogItemRequest {
  name: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  properties?: Record<string, unknown>;
  sortOrder?: number;
}

export interface UpdateGarmentCatalogItemRequest {
  name?: string;
  code?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  properties?: Record<string, unknown> | null;
  sortOrder?: number;
  enabled?: boolean;
}

export interface ReorderGarmentCatalogCategoriesRequest {
  categoryIds: string[];
}

export interface ReorderGarmentCatalogItemsRequest {
  itemIds: string[];
}
