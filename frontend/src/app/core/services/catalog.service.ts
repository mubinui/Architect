import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogItem, Shop, CustomItemRequest } from '../models/catalog.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private baseUrl = `${environment.apiUrl}/catalog`;

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

  searchExternalItems(shop: string, query: string): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(`${environment.apiUrl}/scraper/search_external`, {
      params: { shop, q: query }
    });
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
}
