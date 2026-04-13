"""Sitemap-driven catalog indexer.

Crawls each vendor's public sitemap once and builds a local searchable
index so the catalog browser can browse real products instantly without
hitting DuckDuckGo at request time.

Reuses `ImageExtractor` from `src.routers.scraper` unchanged — only the
*discovery* step (sitemap crawl) is new.
"""
from __future__ import annotations

import asyncio
import hashlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import httpx

from src.models.catalog import CatalogCategory, CatalogItem
from src.routers.scraper import ImageExtractor


_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.8",
}

_XML_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


@dataclass(frozen=True)
class VendorConfig:
    domain: str
    name: str
    logo_emoji: str
    sitemaps: tuple[str, ...]
    product_url_regex: re.Pattern[str]
    default_category: CatalogCategory
    # Only descend nested <sitemap> entries whose URL matches (None = all)
    nested_sitemap_regex: re.Pattern[str] | None = None
    # Exclude product URLs that shouldn't be indexed (privacy, checkout, etc.)
    exclude_url_regex: re.Pattern[str] | None = None
    max_products: int = 300


VENDORS: dict[str, VendorConfig] = {
    "hatil.com": VendorConfig(
        domain="hatil.com",
        name="Hatil",
        logo_emoji="🪑",
        sitemaps=("https://hatil.com/sitemap.xml",),
        # Product URLs look like /Bar-Stool/virgo-103 — two path segments,
        # first a PascalCase-dashed category, second a slug with a digit.
        product_url_regex=re.compile(
            r"hatil\.com/[A-Z][A-Za-z]+(?:-[A-Z][A-Za-z]+)*/[a-z0-9][a-z0-9\-]*\d",
            re.I,
        ),
        exclude_url_regex=re.compile(r"(view-cart|checkout|search|\.xml$)", re.I),
        default_category=CatalogCategory.FURNITURE,
        max_products=300,
    ),
    "ikea.com": VendorConfig(
        domain="ikea.com",
        name="IKEA",
        logo_emoji="🛋️",
        sitemaps=("https://www.ikea.com/sitemaps/sitemap.xml",),
        # Only descend GB English product sitemaps (hundreds of locales exist)
        nested_sitemap_regex=re.compile(r"prod-en-GB_\d+\.xml", re.I),
        product_url_regex=re.compile(r"ikea\.com/gb/en/p/[\w\-]+\d+/?$", re.I),
        default_category=CatalogCategory.FURNITURE,
        max_products=200,
    ),
    "akijceramics.com": VendorConfig(
        domain="akijceramics.com",
        name="Akij Ceramics",
        logo_emoji="🧱",
        sitemaps=(
            "https://www.akijceramics.com/sitemap_index.xml",
            "https://www.akijceramics.com/sitemap.xml",
            "https://akijceramics.com/sitemap.xml",
        ),
        product_url_regex=re.compile(
            r"akijceramics\.com/.*(product|tile|item|shop|collection)/", re.I
        ),
        default_category=CatalogCategory.TILES,
        max_products=200,
    ),
    "rakceramics.com": VendorConfig(
        domain="rakceramics.com",
        name="RAK Ceramics",
        logo_emoji="💎",
        sitemaps=("https://www.rakceramics.com/sitemap.xml",),
        # Only descend the UAE English geo-sitemap
        nested_sitemap_regex=re.compile(r"/uae/en/sitemap\.xml", re.I),
        # Product-ish URLs: category then a named collection/product, trailing slash
        product_url_regex=re.compile(
            r"rakceramics\.com/uae/en/(tiles-floors-coverings|bathroom-kitchen)/[^/]+/?$",
            re.I,
        ),
        default_category=CatalogCategory.SURFACES,
        max_products=200,
    ),
    "ashleyfurniture.com": VendorConfig(
        domain="ashleyfurniture.com",
        name="Ashley Furniture",
        logo_emoji="🛏️",
        sitemaps=("https://www.ashleyfurniture.com/sitemap_index.xml",),
        nested_sitemap_regex=re.compile(r"sitemap_\d+-product\.xml", re.I),
        product_url_regex=re.compile(r"ashleyfurniture\.com/p/", re.I),
        default_category=CatalogCategory.FURNITURE,
        max_products=200,
    ),
    "cb2.com": VendorConfig(
        domain="cb2.com",
        name="CB2",
        logo_emoji="✨",
        sitemaps=(
            "https://www.cb2.com/sitemap.xml",
            "https://www.cb2.com/sitemap_index.xml",
        ),
        product_url_regex=re.compile(r"cb2\.com/.*/s\d+", re.I),
        default_category=CatalogCategory.FURNITURE,
        max_products=200,
    ),
}


# Keyword → (category, tag) inference for items without better metadata
_CATEGORY_KEYWORDS: list[tuple[re.Pattern[str], CatalogCategory]] = [
    (re.compile(r"\b(tile|ceramic|porcelain|mosaic)\b", re.I), CatalogCategory.TILES),
    (re.compile(r"\b(slab|marble|granite|countertop|quartz|surface)\b", re.I), CatalogCategory.SURFACES),
    (re.compile(r"\b(lamp|chandelier|pendant|sconce|lighting|bulb)\b", re.I), CatalogCategory.LIGHTING),
    (re.compile(r"\b(rug|curtain|pillow|cushion|throw|linen|fabric|textile)\b", re.I), CatalogCategory.TEXTILES),
    (re.compile(r"\b(vase|artwork|frame|mirror|decor|ornament|sculpture)\b", re.I), CatalogCategory.DECOR),
    (re.compile(r"\b(bed|sofa|chair|table|desk|wardrobe|shelf|cabinet|stool|dresser|couch|dining|bookcase)\b", re.I), CatalogCategory.FURNITURE),
]


def _infer_category(text: str, default: CatalogCategory) -> CatalogCategory:
    for rx, cat in _CATEGORY_KEYWORDS:
        if rx.search(text):
            return cat
    return default


_GENERIC_TAILS = {"", "t", "index", "p", "product", "detail", "view"}


def _pretty_name_from_url(url: str) -> str:
    """Derive a readable name from a URL.

    Walks from the last path segment backwards and skips generic tails like
    `/t.html`, `/index.html`, `/view`, etc., so Ashley-style URLs
    `/p/serta_motion_essent_.../t.html` yield "Serta Motion Essent ..." not "T".
    """
    parts = [p for p in url.rstrip("/").split("/") if p]
    # Drop scheme/host
    if parts and parts[0].endswith(":"):
        parts = parts[2:]  # scheme + host
    parts = [p for p in parts if "." not in p or not p.split(".")[-1].isalpha() or len(p) > 4]

    def _clean(seg: str) -> str:
        seg = re.sub(r"\.(html?|php|aspx?)$", "", seg, flags=re.I)
        seg = re.sub(r"[-_]+", " ", seg)
        seg = re.sub(r"\s+", " ", seg).strip()
        return seg

    for seg in reversed(parts):
        cleaned = _clean(seg)
        if cleaned.lower() not in _GENERIC_TAILS and len(cleaned) > 1:
            return cleaned.title()
    return "Product"


def _stable_id(domain: str, url: str) -> str:
    digest = hashlib.blake2b(url.encode("utf-8"), digest_size=8).hexdigest()
    return f"{domain}_{digest}"


async def _fetch_text(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        res = await client.get(url, headers=_HEADERS, timeout=20.0)
        if res.status_code != 200:
            return None
        return res.text
    except Exception:
        return None


_SM_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
_IMG_NS = "{http://www.google.com/schemas/sitemap-image/1.1}"


def _iter_sitemap_entries(xml_text: str) -> Iterable[tuple[str, str | None]]:
    """Yield (loc, first_image_url) for each <url> or <sitemap> in a sitemap.

    Works with both `<urlset>` (with optional `<image:image>` children) and
    `<sitemapindex>`. Falls back to a regex scrape if the XML is malformed.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        for m in re.finditer(r"<loc>\s*([^<\s]+)\s*</loc>", xml_text, re.I):
            yield m.group(1), None
        return

    # <urlset> → each child is <url> with <loc> + optional <image:image><image:loc>
    for url_el in root.iter(f"{_SM_NS}url"):
        loc_el = url_el.find(f"{_SM_NS}loc")
        if loc_el is None or not loc_el.text:
            continue
        img_loc_el = url_el.find(f"{_IMG_NS}image/{_IMG_NS}loc")
        img = img_loc_el.text.strip() if (img_loc_el is not None and img_loc_el.text) else None
        yield loc_el.text.strip(), img

    # <sitemapindex> → each child is <sitemap> with <loc>
    for sm_el in root.iter(f"{_SM_NS}sitemap"):
        loc_el = sm_el.find(f"{_SM_NS}loc")
        if loc_el is not None and loc_el.text:
            yield loc_el.text.strip(), None

    # Namespace-less fallback
    if not any(True for _ in root.iter(f"{_SM_NS}url")) and not any(
        True for _ in root.iter(f"{_SM_NS}sitemap")
    ):
        for loc_el in root.iter("loc"):
            if loc_el.text:
                yield loc_el.text.strip(), None


async def _collect_product_entries(
    client: httpx.AsyncClient, cfg: VendorConfig, max_depth: int = 3
) -> list[tuple[str, str | None]]:
    """Walk sitemap + nested indexes, return (product_url, optional_image)."""
    seen: set[str] = set()
    products: list[tuple[str, str | None]] = []
    frontier: list[tuple[str, int]] = [(sm, 0) for sm in cfg.sitemaps]

    while frontier and len(products) < cfg.max_products * 3:
        url, depth = frontier.pop(0)
        if url in seen:
            continue
        seen.add(url)

        text = await _fetch_text(client, url)
        if not text:
            continue

        for loc, img in _iter_sitemap_entries(text):
            if loc in seen:
                continue
            # Nested sitemap descent
            if loc.endswith((".xml", ".xml.gz")) and depth < max_depth:
                if cfg.nested_sitemap_regex and not cfg.nested_sitemap_regex.search(loc):
                    continue
                frontier.append((loc, depth + 1))
                continue
            if cfg.exclude_url_regex and cfg.exclude_url_regex.search(loc):
                continue
            if cfg.product_url_regex.search(loc):
                products.append((loc, img))
                if len(products) >= cfg.max_products * 3:
                    break

    # Deduplicate by URL, preserve first-seen order
    deduped: list[tuple[str, str | None]] = []
    seen_prod: set[str] = set()
    for u, img in products:
        if u in seen_prod:
            continue
        seen_prod.add(u)
        deduped.append((u, img))
        if len(deduped) >= cfg.max_products:
            break
    return deduped


def _item_from_sitemap(cfg: VendorConfig, url: str, image_url: str) -> CatalogItem:
    """Build a CatalogItem without fetching the product page.

    Used when the sitemap itself exposed <image:loc>. Name is derived from
    the URL slug; description is a human-readable fallback.
    """
    name = _pretty_name_from_url(url)[:80]
    description = f"{cfg.name} · {name}"[:400]
    category = _infer_category(f"{url} {name}", cfg.default_category)
    return CatalogItem(
        id=_stable_id(cfg.domain, url),
        name=name,
        description=description,
        category=category,
        shop_id=cfg.domain,
        image_base64=image_url,
        tags=[cfg.domain, "indexed"],
        is_custom=False,
    )


async def _extract_product(
    client: httpx.AsyncClient, cfg: VendorConfig, url: str
) -> CatalogItem | None:
    html = await _fetch_text(client, url)
    if not html:
        return None

    extractor = ImageExtractor(base_url=url)
    try:
        extractor.feed(html)
    except Exception:
        return None
    images = sorted(extractor.images, key=lambda x: x["priority"], reverse=True)
    if not images:
        return None
    top_image = images[0]["url"]

    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    raw_title = (title_match.group(1).strip() if title_match else "") or _pretty_name_from_url(url)
    raw_title = re.sub(
        r"\s*[\|\-–]\s*[^|\-–]*(hatil|ikea|akij|rak|ashley|cb2)[^|\-–]*$",
        "",
        raw_title,
        flags=re.I,
    )
    raw_title = re.sub(r"\s+", " ", raw_title).strip()
    name = raw_title[:80]

    desc_match = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        html,
        re.I,
    )
    description = (desc_match.group(1).strip() if desc_match else f"From {cfg.name}: {url}")[:400]

    category = _infer_category(f"{url} {name} {description}", cfg.default_category)

    return CatalogItem(
        id=_stable_id(cfg.domain, url),
        name=name,
        description=description,
        category=category,
        shop_id=cfg.domain,
        image_base64=top_image,
        tags=[cfg.domain, "indexed"],
        is_custom=False,
    )


async def crawl_vendor(cfg: VendorConfig, concurrency: int = 12) -> list[CatalogItem]:
    """Crawl a single vendor and return its catalog items.

    Fast path: if the sitemap itself embedded <image:image> for a product,
    we skip fetching the product page entirely. Slow path (HTML fetch) only
    kicks in when the sitemap had no image for that URL.
    """
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        entries = await _collect_product_entries(client, cfg)
        if not entries:
            return []

        items: list[CatalogItem] = []
        needs_fetch: list[str] = []

        for url, img in entries:
            if img:
                items.append(_item_from_sitemap(cfg, url, img))
            else:
                needs_fetch.append(url)

        if needs_fetch:
            sem = asyncio.Semaphore(concurrency)

            async def worker(u: str) -> CatalogItem | None:
                async with sem:
                    return await _extract_product(client, cfg, u)

            results = await asyncio.gather(
                *(worker(u) for u in needs_fetch), return_exceptions=True
            )
            for r in results:
                if isinstance(r, CatalogItem):
                    items.append(r)

    return items


@dataclass
class VendorIndex:
    domain: str
    name: str
    logo_emoji: str
    items: list[CatalogItem]
    indexed_at: str
    error: str | None = None


async def crawl_all(
    vendor_domains: Iterable[str] | None = None,
) -> dict[str, VendorIndex]:
    """Crawl every configured vendor (or a subset) in parallel.

    Returns a dict keyed by domain. Vendors that fail keep an empty item list
    and an `error` message so the UI can show a retry state instead of crashing.
    """
    domains = list(vendor_domains) if vendor_domains else list(VENDORS.keys())
    now = datetime.now(timezone.utc).isoformat()

    async def run(domain: str) -> tuple[str, VendorIndex]:
        cfg = VENDORS[domain]
        try:
            items = await crawl_vendor(cfg)
            return domain, VendorIndex(
                domain=cfg.domain,
                name=cfg.name,
                logo_emoji=cfg.logo_emoji,
                items=items,
                indexed_at=now,
                error=None if items else "No items found in sitemap",
            )
        except Exception as exc:  # pragma: no cover - surfaced to UI
            return domain, VendorIndex(
                domain=cfg.domain,
                name=cfg.name,
                logo_emoji=cfg.logo_emoji,
                items=[],
                indexed_at=now,
                error=f"{type(exc).__name__}: {exc}",
            )

    pairs = await asyncio.gather(*(run(d) for d in domains if d in VENDORS))
    return dict(pairs)


if __name__ == "__main__":  # pragma: no cover
    import argparse
    import json
    import sys

    parser = argparse.ArgumentParser(description="Crawl vendor sitemaps")
    parser.add_argument("--vendor", help="Limit to a single vendor domain")
    args = parser.parse_args()

    domains = [args.vendor] if args.vendor else None
    result = asyncio.run(crawl_all(domains))
    summary = {
        d: {"count": len(v.items), "error": v.error, "sample": [i.name for i in v.items[:5]]}
        for d, v in result.items()
    }
    json.dump(summary, sys.stdout, indent=2)
    print()
