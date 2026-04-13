from fastapi import APIRouter, HTTPException, Query
import httpx
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

router = APIRouter(tags=["scraper"])

class ImageExtractor(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.images = []
        self.in_product_gallery = False
        
        # Domain parsing
        parsed_url = urlparse(base_url)
        self.domain = parsed_url.netloc.lower()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        class_str = attrs_dict.get("class", "").lower()
        id_str = attrs_dict.get("id", "").lower()
        
        # Heuristics for hitting product galleries
        if tag in ["div", "ul", "li", "figure"]:
            if "gallery" in class_str or "product" in class_str or "zoom" in class_str or "slider" in class_str:
                self.in_product_gallery = True
                
        if tag == "img":
            src = attrs_dict.get("src") or attrs_dict.get("data-src") or attrs_dict.get("data-lazy")
            if not src:
                return
                
            absolute_url = urljoin(self.base_url, src)
            parsed = urlparse(absolute_url)
            
            if parsed.scheme not in ["http", "https"]:
                return
                
            # Exclude obvious small icons/logos
            if "logo" in absolute_url.lower() or "icon" in absolute_url.lower() or absolute_url.endswith(".svg"):
                return
                
            # Domain-Specific Prioritization
            priority = 0
            
            # Hatil Specific
            if "hatil.com" in self.domain:
                if "catalog/product" in absolute_url:
                    priority = 10
                elif self.in_product_gallery:
                    priority = 5
            
            # Akij Ceramics Specific
            elif "akijceramics.com" in self.domain or "akij.com" in self.domain:
                if "uploads/products" in absolute_url or "product" in class_str:
                    priority = 10
                elif self.in_product_gallery:
                    priority = 5
                    
            # RAK Ceramics Specific
            elif "rakceramics.com" in self.domain:
                if "product-images" in absolute_url or "collection" in absolute_url:
                    priority = 10
            
            # Generic heuristics for other stores
            else:
                if "product" in absolute_url or "gallery" in absolute_url or "large" in absolute_url:
                    priority = 5
                if self.in_product_gallery:
                    priority += 3

            self.images.append({"url": absolute_url, "priority": priority})

    def handle_endtag(self, tag):
        # Extremely basic reset to prevent false positives deep in the tree
        if tag in ["div", "ul", "figure"]:
            self.in_product_gallery = False

@router.get("/scraper/scan")
async def scan_website(url: str = Query(..., description="The URL of the website to scan for images")):
    if not url.startswith("http"):
        url = "https://" + url

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        
        async with httpx.AsyncClient(follow_redirects=True, verify=False, timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type.lower():
                raise HTTPException(status_code=400, detail="URL did not return an HTML document.")
                
            html_content = response.text
            
            extractor = ImageExtractor(base_url=str(response.url))
            extractor.feed(html_content)
            
            # Sort extracted images by priority descending
            sorted_images = sorted(extractor.images, key=lambda x: x["priority"], reverse=True)
            
            # Deduplicate while preserving priority order
            seen = set()
            unique_images = []
            for img in sorted_images:
                if img["url"] not in seen:
                    seen.add(img["url"])
                    unique_images.append(img["url"])
                    
            return {"images": unique_images}
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to the website: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Website returned an error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

