"""Per-vendor catalog index persistence.

Stores the output of `catalog_indexer.crawl_vendor` at
`{data_dir}/catalog/vendor_index/{domain}.json` and serves search/browse
queries from an in-memory cache.
"""
from __future__ import annotations

import asyncio
import json
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from src.models.catalog import CatalogItem
from src.services.catalog_indexer import VENDORS, VendorIndex, crawl_all


@dataclass
class VendorSummary:
    domain: str
    name: str
    logo_emoji: str
    item_count: int
    indexed_at: str | None
    error: str | None = None


@dataclass
class _CacheEntry:
    index: VendorIndex
    by_category: dict[str, list[CatalogItem]] = field(default_factory=dict)


class VendorIndexStore:
    def __init__(self, data_dir: str):
        self.root = Path(data_dir) / "catalog" / "vendor_index"
        self.root.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, _CacheEntry] = {}
        self._lock = threading.Lock()
        self._crawl_lock = asyncio.Lock()
        self._load_existing()

    # ── Persistence ──

    def _path(self, domain: str) -> Path:
        safe = domain.replace("/", "_")
        return self.root / f"{safe}.json"

    def _load_existing(self) -> None:
        for cfg in VENDORS.values():
            path = self._path(cfg.domain)
            if not path.exists():
                continue
            try:
                raw = json.loads(path.read_text())
            except json.JSONDecodeError:
                continue
            items = [CatalogItem.model_validate(i) for i in raw.get("items", [])]
            idx = VendorIndex(
                domain=raw.get("domain", cfg.domain),
                name=raw.get("name", cfg.name),
                logo_emoji=raw.get("logo_emoji", cfg.logo_emoji),
                items=items,
                indexed_at=raw.get("indexed_at", ""),
                error=raw.get("error"),
            )
            self._cache[cfg.domain] = _build_entry(idx)

    def _persist(self, index: VendorIndex) -> None:
        payload = {
            "domain": index.domain,
            "name": index.name,
            "logo_emoji": index.logo_emoji,
            "indexed_at": index.indexed_at,
            "error": index.error,
            "items": [i.model_dump(mode="json") for i in index.items],
        }
        self._path(index.domain).write_text(json.dumps(payload, ensure_ascii=False, indent=2))

    # ── Public API ──

    def list_vendors(self) -> list[VendorSummary]:
        summaries: list[VendorSummary] = []
        for cfg in VENDORS.values():
            entry = self._cache.get(cfg.domain)
            if entry:
                summaries.append(
                    VendorSummary(
                        domain=cfg.domain,
                        name=cfg.name,
                        logo_emoji=cfg.logo_emoji,
                        item_count=len(entry.index.items),
                        indexed_at=entry.index.indexed_at or None,
                        error=entry.index.error,
                    )
                )
            else:
                summaries.append(
                    VendorSummary(
                        domain=cfg.domain,
                        name=cfg.name,
                        logo_emoji=cfg.logo_emoji,
                        item_count=0,
                        indexed_at=None,
                        error="not_indexed",
                    )
                )
        return summaries

    def get_item(self, item_id: str) -> CatalogItem | None:
        for entry in self._cache.values():
            for item in entry.index.items:
                if item.id == item_id:
                    return item
        return None

    def get_items_by_ids(self, ids: Iterable[str]) -> list[CatalogItem]:
        id_set = set(ids)
        out: list[CatalogItem] = []
        for entry in self._cache.values():
            for item in entry.index.items:
                if item.id in id_set:
                    out.append(item)
        return out

    def categories(self, domain: str) -> list[dict]:
        entry = self._cache.get(domain)
        if not entry:
            return []
        counts: dict[str, int] = {}
        for item in entry.index.items:
            key = item.category.value
            counts[key] = counts.get(key, 0) + 1
        return [{"value": k, "label": k.title(), "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]

    def browse(
        self,
        domain: str,
        q: str = "",
        category: str = "",
        page: int = 1,
        limit: int = 60,
    ) -> dict:
        entry = self._cache.get(domain)
        if not entry:
            return {"items": [], "total": 0, "page": page, "limit": limit, "error": "not_indexed"}

        items = entry.index.items
        if category:
            items = entry.by_category.get(category, [])
        if q:
            ql = q.lower()
            items = [
                i for i in items
                if ql in i.name.lower()
                or ql in i.description.lower()
                or any(ql in t.lower() for t in i.tags)
            ]
        total = len(items)
        start = max(0, (page - 1) * limit)
        end = start + limit
        return {
            "items": [i.model_dump(mode="json") for i in items[start:end]],
            "total": total,
            "page": page,
            "limit": limit,
            "error": entry.index.error,
        }

    # ── Crawling ──

    async def reindex(self, domains: list[str] | None = None) -> list[VendorSummary]:
        async with self._crawl_lock:
            result = await crawl_all(domains)
            with self._lock:
                for domain, idx in result.items():
                    entry = _build_entry(idx)
                    # Preserve old items if the new crawl returned nothing but we already had data
                    existing = self._cache.get(domain)
                    if not idx.items and existing and existing.index.items:
                        idx_preserved = VendorIndex(
                            domain=existing.index.domain,
                            name=existing.index.name,
                            logo_emoji=existing.index.logo_emoji,
                            items=existing.index.items,
                            indexed_at=existing.index.indexed_at,
                            error=idx.error or existing.index.error,
                        )
                        entry = _build_entry(idx_preserved)
                        idx = idx_preserved
                    self._cache[domain] = entry
                    self._persist(idx)
        return [s for s in self.list_vendors() if s.domain in result]

    async def ensure_seeded(self) -> None:
        missing = [d for d in VENDORS.keys() if not self._cache.get(d) or not self._cache[d].index.items]
        if missing:
            await self.reindex(missing)


def _build_entry(index: VendorIndex) -> _CacheEntry:
    by_category: dict[str, list[CatalogItem]] = {}
    for item in index.items:
        by_category.setdefault(item.category.value, []).append(item)
    return _CacheEntry(index=index, by_category=by_category)
