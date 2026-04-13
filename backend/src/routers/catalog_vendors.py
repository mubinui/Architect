from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from src.dependencies import get_vendor_index_store
from src.storage.vendor_index_store import VendorIndexStore

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.get("")
async def list_vendors(store: VendorIndexStore = Depends(get_vendor_index_store)):
    return [
        {
            "domain": s.domain,
            "name": s.name,
            "logo_emoji": s.logo_emoji,
            "item_count": s.item_count,
            "indexed_at": s.indexed_at,
            "error": s.error,
        }
        for s in store.list_vendors()
    ]


@router.get("/{domain}/categories")
async def vendor_categories(
    domain: str,
    store: VendorIndexStore = Depends(get_vendor_index_store),
):
    return store.categories(domain)


@router.get("/{domain}/items")
async def vendor_items(
    domain: str,
    q: str = "",
    category: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(60, ge=1, le=200),
    store: VendorIndexStore = Depends(get_vendor_index_store),
):
    # Always return 200 — empty items + error message lets the UI render
    # the retry banner instead of breaking the browse flow.
    return store.browse(domain, q=q, category=category, page=page, limit=limit)


@router.post("/{domain}/reindex")
async def vendor_reindex(
    domain: str,
    background_tasks: BackgroundTasks,
    store: VendorIndexStore = Depends(get_vendor_index_store),
):
    from src.services.catalog_indexer import VENDORS

    if domain not in VENDORS:
        raise HTTPException(status_code=404, detail="Unknown vendor")

    async def run() -> None:
        await store.reindex([domain])

    background_tasks.add_task(run)
    return {"status": "queued", "domain": domain}
