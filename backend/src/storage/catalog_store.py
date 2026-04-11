import json
from pathlib import Path

from src.models.catalog import CatalogItem, Shop, CatalogCategory


class CatalogStore:
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir) / "catalog"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_seed_data()

    def _shops_path(self) -> Path:
        return self.data_dir / "shops.json"

    def _custom_path(self) -> Path:
        return self.data_dir / "custom_items.json"

    def _ensure_seed_data(self):
        if not self._shops_path().exists():
            self._shops_path().write_text("[]")
        if not self._custom_path().exists():
            self._custom_path().write_text("[]")

    def load_shops(self) -> list[Shop]:
        data = json.loads(self._shops_path().read_text())
        shops = [Shop.model_validate(s) for s in data]
        # Add "My Collection" shop with custom items
        custom_items = self._load_custom_items()
        if custom_items:
            my_shop = Shop(
                id="my_collection",
                name="My Collection",
                description="Your uploaded custom items",
                logo_emoji="⭐",
                items=custom_items,
            )
            shops.append(my_shop)
        return shops

    def load_shop(self, shop_id: str) -> Shop | None:
        if shop_id == "my_collection":
            custom_items = self._load_custom_items()
            return Shop(
                id="my_collection",
                name="My Collection",
                description="Your uploaded custom items",
                logo_emoji="⭐",
                items=custom_items,
            )
        shops = json.loads(self._shops_path().read_text())
        for s in shops:
            if s.get("id") == shop_id:
                return Shop.model_validate(s)
        return None

    def search_items(
        self, query: str = "", category: str = ""
    ) -> list[CatalogItem]:
        all_items: list[CatalogItem] = []
        for shop in self.load_shops():
            for item in shop.items:
                item.shop_id = shop.id
                all_items.append(item)

        results = all_items
        if query:
            q = query.lower()
            results = [
                i for i in results
                if q in i.name.lower()
                or q in i.description.lower()
                or any(q in t.lower() for t in i.tags)
            ]
        if category:
            results = [i for i in results if i.category.value == category]

        return results

    def get_item(self, item_id: str) -> CatalogItem | None:
        for shop in self.load_shops():
            for item in shop.items:
                if item.id == item_id:
                    return item
        return None

    def get_items_by_ids(self, item_ids: list[str]) -> list[CatalogItem]:
        result = []
        for shop in self.load_shops():
            for item in shop.items:
                if item.id in item_ids:
                    result.append(item)
        return result

    def _load_custom_items(self) -> list[CatalogItem]:
        data = json.loads(self._custom_path().read_text())
        return [CatalogItem.model_validate(i) for i in data]

    def save_custom_item(self, item: CatalogItem) -> CatalogItem:
        items = self._load_custom_items()
        item.is_custom = True
        item.shop_id = "my_collection"
        items.append(item)
        self._save_custom_items(items)
        return item

    def delete_custom_item(self, item_id: str) -> bool:
        items = self._load_custom_items()
        before = len(items)
        items = [i for i in items if i.id != item_id]
        if len(items) < before:
            self._save_custom_items(items)
            return True
        return False

    def _save_custom_items(self, items: list[CatalogItem]):
        data = [i.model_dump() for i in items]
        self._custom_path().write_text(json.dumps(data, indent=2))
