from src.models.room import RoomSpec, RoomType


# Reasonable furniture size guidelines per room type (in square meters minimum)
FURNITURE_SIZE_GUIDE: dict[str, dict[str, float]] = {
    "king bed": {"min_area": 14.0},
    "queen bed": {"min_area": 10.0},
    "double bed": {"min_area": 9.0},
    "single bed": {"min_area": 6.0},
    "dining table for 6": {"min_area": 12.0},
    "dining table for 4": {"min_area": 9.0},
    "L-shaped sofa": {"min_area": 16.0},
    "sectional sofa": {"min_area": 18.0},
    "sofa": {"min_area": 10.0},
    "bathtub": {"min_area": 5.0},
    "kitchen island": {"min_area": 12.0},
    "desk": {"min_area": 6.0},
    "reading nook": {"min_area": 4.0},
}


class SpatialReasoner:
    def analyze(self, room: RoomSpec) -> str:
        area = room.dimensions.width * room.dimensions.length
        volume = area * room.dimensions.height
        scale = self._determine_scale(area, room.room_type)
        warnings = self._check_furniture_fit(area, room.furniture_preferences)
        ceiling_desc = self._describe_ceiling(room.dimensions.height)

        parts = [
            f"The room is {area:.1f} sq meters ({scale} for a {room.room_type.value.replace('_', ' ')})",
            f"with {ceiling_desc} ({room.dimensions.height}m)",
            f"and a volume of {volume:.1f} cubic meters",
        ]

        if room.dimensions.width / room.dimensions.length > 2.0:
            parts.append("— notably elongated layout, consider furniture along the long axis")
        elif room.dimensions.length / room.dimensions.width > 2.0:
            parts.append("— notably elongated layout, consider furniture along the long axis")
        elif abs(room.dimensions.width - room.dimensions.length) < 0.5:
            parts.append("— nearly square layout, consider centered or symmetrical arrangement")

        if warnings:
            parts.append(f". Furniture notes: {'; '.join(warnings)}")

        return ". ".join(parts)

    def _determine_scale(self, area: float, room_type: RoomType) -> str:
        thresholds = {
            RoomType.BEDROOM: (8, 14, 20),
            RoomType.KITCHEN: (6, 12, 18),
            RoomType.BATHROOM: (3, 6, 10),
            RoomType.LIVING_ROOM: (12, 20, 30),
            RoomType.DINING_ROOM: (8, 14, 22),
            RoomType.OFFICE: (5, 10, 16),
            RoomType.HALLWAY: (3, 6, 10),
            RoomType.BALCONY: (3, 6, 10),
            RoomType.GUEST_ROOM: (8, 12, 18),
            RoomType.KIDS_ROOM: (8, 12, 18),
            RoomType.LAUNDRY: (3, 6, 10),
            RoomType.CLOSET: (2, 4, 8),
        }
        small, medium, large = thresholds.get(room_type, (8, 14, 20))

        if area < small:
            return "compact"
        elif area < medium:
            return "moderate-sized"
        elif area < large:
            return "spacious"
        else:
            return "grand"

    def _describe_ceiling(self, height: float) -> str:
        if height < 2.5:
            return "low ceiling creating an intimate atmosphere"
        elif height < 3.0:
            return "standard ceiling height"
        elif height < 3.5:
            return "generous ceiling height adding airiness"
        elif height < 4.5:
            return "high ceiling creating a sense of grandeur"
        else:
            return "double-height ceiling with dramatic vertical space"

    def _check_furniture_fit(self, area: float, furniture: list[str]) -> list[str]:
        warnings = []
        for item in furniture:
            item_lower = item.lower()
            for key, guide in FURNITURE_SIZE_GUIDE.items():
                if key in item_lower:
                    if area < guide["min_area"]:
                        warnings.append(
                            f"'{item}' may be tight for {area:.1f}sqm — consider a smaller alternative"
                        )
                    break
        return warnings
