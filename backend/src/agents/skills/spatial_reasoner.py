from src.models.room import RoomSpec, RoomType


# Reasonable furniture size guidelines per room type (in square feet minimum)
FURNITURE_SIZE_GUIDE: dict[str, dict[str, float]] = {
    "king bed": {"min_area": 150.0},
    "queen bed": {"min_area": 108.0},
    "double bed": {"min_area": 97.0},
    "single bed": {"min_area": 65.0},
    "dining table for 6": {"min_area": 130.0},
    "dining table for 4": {"min_area": 97.0},
    "L-shaped sofa": {"min_area": 172.0},
    "sectional sofa": {"min_area": 194.0},
    "sofa": {"min_area": 108.0},
    "bathtub": {"min_area": 54.0},
    "kitchen island": {"min_area": 130.0},
    "desk": {"min_area": 65.0},
    "reading nook": {"min_area": 43.0},
}


class SpatialReasoner:
    def analyze(self, room: RoomSpec) -> str:
        area = room.dimensions.width * room.dimensions.length
        volume = area * room.dimensions.height
        scale = self._determine_scale(area, room.room_type)
        warnings = self._check_furniture_fit(area, room.furniture_preferences)
        ceiling_desc = self._describe_ceiling(room.dimensions.height)

        parts = [
            f"The room is {area:.0f} sq ft ({scale} for a {room.room_type.value.replace('_', ' ')})",
            f"with {ceiling_desc} ({room.dimensions.height}ft)",
            f"and a volume of {volume:.0f} cubic feet",
        ]

        if room.dimensions.width / room.dimensions.length > 2.0:
            parts.append("— notably elongated layout, consider furniture along the long axis")
        elif room.dimensions.length / room.dimensions.width > 2.0:
            parts.append("— notably elongated layout, consider furniture along the long axis")
        elif abs(room.dimensions.width - room.dimensions.length) < 1.5:
            parts.append("— nearly square layout, consider centered or symmetrical arrangement")

        if warnings:
            parts.append(f". Furniture notes: {'; '.join(warnings)}")

        return ". ".join(parts)

    def _determine_scale(self, area: float, room_type: RoomType) -> str:
        # Thresholds in square feet
        thresholds = {
            RoomType.BEDROOM: (86, 150, 215),
            RoomType.KITCHEN: (65, 130, 194),
            RoomType.BATHROOM: (32, 65, 108),
            RoomType.LIVING_ROOM: (130, 215, 323),
            RoomType.DINING_ROOM: (86, 150, 237),
            RoomType.OFFICE: (54, 108, 172),
            RoomType.HALLWAY: (32, 65, 108),
            RoomType.BALCONY: (32, 65, 108),
            RoomType.GUEST_ROOM: (86, 130, 194),
            RoomType.KIDS_ROOM: (86, 130, 194),
            RoomType.LAUNDRY: (32, 65, 108),
            RoomType.CLOSET: (22, 43, 86),
        }
        small, medium, large = thresholds.get(room_type, (86, 150, 215))

        if area < small:
            return "compact"
        elif area < medium:
            return "moderate-sized"
        elif area < large:
            return "spacious"
        else:
            return "grand"

    def _describe_ceiling(self, height: float) -> str:
        if height < 8:
            return "low ceiling creating an intimate atmosphere"
        elif height < 9.5:
            return "standard ceiling height"
        elif height < 11:
            return "generous ceiling height adding airiness"
        elif height < 15:
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
                            f"'{item}' may be tight for {area:.0f} sq ft — consider a smaller alternative"
                        )
                    break
        return warnings
