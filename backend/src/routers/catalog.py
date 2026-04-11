from fastapi import APIRouter, Depends, HTTPException

from src.models.catalog import CatalogItem, Shop, CustomItemRequest, CatalogCategory
from src.storage.catalog_store import CatalogStore
from src.dependencies import get_catalog_store

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/shops", response_model=list[Shop])
async def list_shops(store: CatalogStore = Depends(get_catalog_store)):
    shops = store.load_shops()
    # Return shops without full item lists for the overview
    return [
        Shop(
            id=s.id,
            name=s.name,
            description=s.description,
            logo_emoji=s.logo_emoji,
            items=[],
        )
        for s in shops
    ]


@router.get("/shops/{shop_id}", response_model=Shop)
async def get_shop(
    shop_id: str, store: CatalogStore = Depends(get_catalog_store)
):
    shop = store.load_shop(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


@router.get("/search", response_model=list[CatalogItem])
async def search_items(
    q: str = "",
    category: str = "",
    store: CatalogStore = Depends(get_catalog_store),
):
    return store.search_items(query=q, category=category)


@router.get("/categories")
async def list_categories():
    return [{"value": c.value, "label": c.value.title()} for c in CatalogCategory]


@router.get("/items/{item_id}", response_model=CatalogItem)
async def get_item(
    item_id: str, store: CatalogStore = Depends(get_catalog_store)
):
    item = store.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/custom", response_model=CatalogItem)
async def create_custom_item(
    req: CustomItemRequest,
    store: CatalogStore = Depends(get_catalog_store),
):
    item = CatalogItem(
        name=req.name,
        description=req.description,
        category=req.category,
        shop_id="my_collection",
        image_base64=req.image_base64,
        tags=req.tags,
        is_custom=True,
    )
    return store.save_custom_item(item)


@router.delete("/custom/{item_id}")
async def delete_custom_item(
    item_id: str, store: CatalogStore = Depends(get_catalog_store)
):
    if not store.delete_custom_item(item_id):
        raise HTTPException(status_code=404, detail="Custom item not found")
    return {"status": "deleted"}
