import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogItem, Shop, CustomItemRequest } from '../models/catalog.model';
import { environment } from '../../../environments/environment';

export interface VendorSummary {
  domain: string;
  name: string;
  logo_emoji: string;
  item_count: number;
  indexed_at: string | null;
  error: string | null;
}

export interface VendorCategory {
  value: string;
  label: string;
  count: number;
}

export interface VendorBrowseResult {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
  error: string | null;
}

export interface BrowseOptions {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private baseUrl = `${environment.apiUrl}/catalog`;
  private vendorsUrl = `${environment.apiUrl}/vendors`;

  constructor(private http: HttpClient) {}

  getShops(): Observable<Shop[]> {
    return this.http.get<Shop[]>(`${this.baseUrl}/shops`);
  }

  getShop(shopId: string): Observable<Shop> {
    return this.http.get<Shop>(`${this.baseUrl}/shops/${shopId}`);
  }

  searchItems(query: string = '', category: string = ''): Observable<CatalogItem[]> {
    const params: Record<string, string> = {};
    if (query) params['q'] = query;
    if (category) params['category'] = category;
    return this.http.get<CatalogItem[]>(`${this.baseUrl}/search`, { params });
  }

  getItem(itemId: string): Observable<CatalogItem> {
    return this.http.get<CatalogItem>(`${this.baseUrl}/items/${itemId}`);
  }

  createCustomItem(req: CustomItemRequest): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(`${this.baseUrl}/custom`, req);
  }

  deleteCustomItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/custom/${itemId}`);
  }

  // ── Vendor catalog (sitemap-backed local index) ──

  listVendors(): Observable<VendorSummary[]> {
    return this.http.get<VendorSummary[]>(this.vendorsUrl);
  }

  getVendorCategories(domain: string): Observable<VendorCategory[]> {
    return this.http.get<VendorCategory[]>(`${this.vendorsUrl}/${domain}/categories`);
  }

  browseVendor(domain: string, opts: BrowseOptions = {}): Observable<VendorBrowseResult> {
    const params: Record<string, string> = {};
    if (opts.q) params['q'] = opts.q;
    if (opts.category) params['category'] = opts.category;
    if (opts.page) params['page'] = String(opts.page);
    if (opts.limit) params['limit'] = String(opts.limit);
    return this.http.get<VendorBrowseResult>(`${this.vendorsUrl}/${domain}/items`, { params });
  }

  reindexVendor(domain: string): Observable<{ status: string; domain: string }> {
    return this.http.post<{ status: string; domain: string }>(
      `${this.vendorsUrl}/${domain}/reindex`,
      {}
    );
  }
}
