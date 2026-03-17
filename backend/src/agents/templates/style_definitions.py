STYLE_VOCABULARY: dict[str, dict[str, list[str]]] = {
    "modern": {
        "materials": ["glass", "polished concrete", "steel", "lacquered wood", "engineered stone"],
        "shapes": ["clean lines", "geometric forms", "open plan", "asymmetric balance"],
        "textures": ["smooth", "glossy", "matte finish", "flat surfaces"],
        "furniture": ["platform beds", "sectional sofas", "floating vanities", "cantilevered shelves"],
        "avoid": ["ornate carvings", "floral patterns", "heavy drapes", "rustic wood"],
    },
    "minimalist": {
        "materials": ["white plaster", "light wood", "glass", "concrete", "matte metal"],
        "shapes": ["simple geometric", "uncluttered", "negative space", "monolithic forms"],
        "textures": ["smooth", "uniform", "subtle grain", "seamless"],
        "furniture": ["low-profile beds", "simple slab tables", "hidden storage", "built-in cabinetry"],
        "avoid": ["excessive decoration", "bold patterns", "ornamental objects", "heavy textures"],
    },
    "industrial": {
        "materials": ["exposed brick", "raw steel", "reclaimed wood", "concrete", "iron pipes"],
        "shapes": ["utilitarian", "exposed structure", "open ductwork", "loft-style"],
        "textures": ["rough", "weathered", "distressed", "raw unfinished"],
        "furniture": ["metal frame furniture", "leather seating", "factory-style lighting", "rolling carts"],
        "avoid": ["delicate fabrics", "pastel colors", "ornate details", "polished finishes"],
    },
    "scandinavian": {
        "materials": ["light birch", "white oak", "wool", "linen", "ceramic"],
        "shapes": ["organic curves", "functional forms", "tapered legs", "simple silhouettes"],
        "textures": ["cozy knits", "natural grain", "soft matte", "woven textiles"],
        "furniture": ["Danish chairs", "simple shelving", "wool throws", "pendant lamps"],
        "avoid": ["dark heavy wood", "ornate patterns", "synthetic materials", "cluttered arrangements"],
    },
    "bohemian": {
        "materials": ["rattan", "macrame", "natural fibers", "kilim rugs", "terracotta"],
        "shapes": ["layered", "eclectic mix", "collected aesthetic", "relaxed arrangement"],
        "textures": ["woven", "tasseled", "embroidered", "hand-crafted"],
        "furniture": ["low seating", "floor cushions", "vintage pieces", "hanging chairs"],
        "avoid": ["sterile modern", "matching sets", "minimalist austerity", "corporate feel"],
    },
    "traditional": {
        "materials": ["mahogany", "marble", "velvet", "silk", "brass"],
        "shapes": ["symmetrical", "arched doorways", "crown molding", "wainscoting"],
        "textures": ["rich fabrics", "polished wood", "tufted upholstery", "damask"],
        "furniture": ["wingback chairs", "four-poster beds", "roll-arm sofas", "console tables"],
        "avoid": ["industrial elements", "stark minimalism", "raw concrete", "exposed pipes"],
    },
    "japandi": {
        "materials": ["light ash wood", "bamboo", "stone", "linen", "clay"],
        "shapes": ["wabi-sabi imperfection", "clean zen lines", "low-profile", "organic natural forms"],
        "textures": ["raw natural", "handmade ceramic", "smooth wood", "stone"],
        "furniture": ["floor-level beds", "low tables", "shoji screens", "simple pottery"],
        "avoid": ["bright bold colors", "heavy ornament", "synthetic materials", "cluttered spaces"],
    },
    "mid_century_modern": {
        "materials": ["walnut wood", "teak", "fiberglass", "brass accents", "terrazzo"],
        "shapes": ["organic curves", "tapered legs", "starburst patterns", "boomerang forms"],
        "textures": ["smooth lacquer", "tweed upholstery", "patterned textiles", "wood grain"],
        "furniture": ["Eames-style chairs", "tulip tables", "credenzas", "sputnik chandeliers"],
        "avoid": ["heavy traditional", "raw industrial", "ultra-modern chrome", "rustic farmhouse"],
    },
    "contemporary": {
        "materials": ["mixed metals", "glass", "natural stone", "engineered wood", "fabric"],
        "shapes": ["fluid forms", "sculptural elements", "bold geometry", "layered planes"],
        "textures": ["varied tactile mix", "smooth and rough contrast", "luxe finishes"],
        "furniture": ["statement pieces", "curved sofas", "art-like lighting", "mixed material tables"],
        "avoid": ["period-specific motifs", "overly matched sets", "dated trends"],
    },
    "art_deco": {
        "materials": ["lacquered surfaces", "brass", "marble", "velvet", "mirrored glass"],
        "shapes": ["bold geometric", "sunburst motifs", "stepped forms", "chevron patterns"],
        "textures": ["high gloss", "luxurious fabrics", "metallic shimmer", "polished stone"],
        "furniture": ["channel-tufted sofas", "geometric side tables", "bar carts", "vanity mirrors"],
        "avoid": ["rustic simplicity", "raw unfinished", "casual boho", "industrial roughness"],
    },
    "coastal": {
        "materials": ["whitewashed wood", "jute", "sea glass", "driftwood", "cotton"],
        "shapes": ["relaxed flowing", "organic curved", "open airy", "nautical lines"],
        "textures": ["woven rope", "sandy finish", "weathered paint", "soft linen"],
        "furniture": ["slipcovered sofas", "wicker chairs", "ship-lap walls", "lantern lighting"],
        "avoid": ["dark heavy materials", "formal arrangements", "industrial metal", "ornate gilding"],
    },
    "rustic": {
        "materials": ["reclaimed barn wood", "natural stone", "wrought iron", "leather", "burlap"],
        "shapes": ["sturdy heavy", "natural irregular", "handcrafted", "cabin-style"],
        "textures": ["rough hewn", "knotty wood", "hand-forged metal", "coarse woven"],
        "furniture": ["farmhouse tables", "log beds", "antler chandeliers", "cast iron fixtures"],
        "avoid": ["sleek modern", "high gloss", "minimalist austerity", "chrome and glass"],
    },
}


def get_style_vocab(style: str) -> dict[str, list[str]]:
    return STYLE_VOCABULARY.get(style, STYLE_VOCABULARY["modern"])
