import re
from typing import Any, Dict

from app.services.database import save_place
from app.services.place_enrichment import (
    expand_short_url,
    extract_coordinates_from_text,
    extract_url,
    geocode_place,
    search_pexels_photo,
)
from app.services.llm import extract_place_with_llm

def detect_place_status(message: str) -> str:
    normalized_message = message.lower()

    favorite_keywords = [
        "favorite",
        "liked",
        "love this place",
        "my favorite",
        "best place",
        "good place",
    ]

    if any(keyword in normalized_message for keyword in favorite_keywords):
        return "favorite"

    return "want_to_visit"


def detect_place_category(message: str) -> str:
    normalized_message = message.lower()

    category_keywords = {
        "ocean": ["ocean", "sea", "beach", "coast", "island"],
        "mountain": ["mountain", "hiking", "hill", "snow"],
        "desert": ["desert", "sand dunes", "sand"],
        "adventure": ["adventure", "zipline", "rafting", "theme park", "amusement"],
        "restaurant": ["restaurant", "food", "cafe", "coffee", "grill", "biryani", "eat"],
        "movie": ["movie", "cinema", "theatre", "theater"],
        "park": ["park", "garden", "trail"],
        "city": ["city", "downtown", "new york", "chicago", "atlanta", "boston"],
        "shopping": ["mall", "shopping", "outlet", "store"],
        "travel": ["trip", "travel", "vacation", "visit"],
    }

    for category, keywords in category_keywords.items():
        if any(keyword in normalized_message for keyword in keywords):
            return category

    return "general"


def detect_environment_tags(message: str) -> list[str]:
    normalized_message = message.lower()

    tag_keywords = {
        "ocean": ["ocean", "sea", "beach", "coast", "island"],
        "mountains": ["mountain", "mountains", "hiking", "hill"],
        "desert": ["desert", "sand"],
        "adventure": ["adventure", "zipline", "rafting", "theme park", "amusement"],
        "food": ["food", "restaurant", "cafe", "coffee", "grill", "biryani", "eat"],
        "movie": ["movie", "cinema", "theatre", "theater"],
        "park": ["park", "garden", "trail"],
        "shopping": ["mall", "shopping", "outlet"],
        "city": ["city", "downtown"],
    }

    tags = []

    for tag, keywords in tag_keywords.items():
        if any(keyword in normalized_message for keyword in keywords):
            tags.append(tag)

    return tags or ["general"]


def clean_place_name(message: str) -> str:
    """
    Basic place-name extraction.
    If the user gives a full description, this creates a short readable name.
    """

    cleaned = re.sub(r"https?://[^\s]+", "", message).strip()

    prefixes = [
        "i want to visit ",
        "i want to vist ",
        "i want to go to ",
        "i want to go ",
        "save this place ",
        "save place ",
        "save ",
        "add this place ",
        "add place ",
        "add ",
        "i liked this restaurant called ",
        "i liked this place called ",
        "i liked ",
        "my favorite place is ",
        "i want to eat at ",
        "i want to try ",
    ]

    lowered = cleaned.lower()

    for prefix in prefixes:
        if lowered.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
            break

    if len(cleaned) > 80:
        return cleaned[:77].strip() + "..."

    return cleaned.rstrip(".").capitalize()


def detect_city(message: str) -> str | None:
    normalized_message = message.lower()

    known_cities = [
        "new york",
        "atlanta",
        "chicago",
        "boston",
        "seattle",
        "miami",
        "los angeles",
        "san francisco",
        "dallas",
        "houston",
        "nashville",
        "birmingham",
        "marietta",
    ]

    for city in known_cities:
        if city in normalized_message:
            return city.title()

    return None


def build_photo_query(place_name: str, category: str, tags: list[str], city: str | None) -> str:
    if city:
        return f"{place_name} {city}"

    if category != "general":
        return f"{category} place"

    return " ".join(tags)

def should_attempt_geocoding(message: str, city: str | None, category: str) -> bool:
    """
    Decides whether the message looks like a real address/place location.
    """

    normalized_message = message.lower()

    address_clues = [
        ",",
        "street",
        "st ",
        "road",
        "rd ",
        "avenue",
        "ave",
        "drive",
        "dr ",
        "lane",
        "ln ",
        "boulevard",
        "blvd",
        "highway",
        "hwy",
        "southwest",
        "southeast",
        "northwest",
        "northeast",
        "ga",
        "georgia",
        "al",
        "alabama",
        "ny",
        "ca",
        "tx",
        "fl",
    ]

    location_categories = [
        "city",
        "restaurant",
        "park",
        "shopping",
        "travel",
        "general",
    ]

    return (
        city is not None
        or category in location_categories
        or any(clue in normalized_message for clue in address_clues)
    )


def handle_places_message(
    message: str,
    extracted_data: Dict[str, Any],
    user_id: str = "demo-user",
) -> Dict[str, Any]:
    """
    Places Agent.

    Responsibility:
    - Save described places
    - Detect Google/maps links
    - Try geocoding with OpenStreetMap
    - Try photo search with Pexels
    """

    source_url = extract_url(message)
    expanded_url = expand_short_url(source_url) if source_url else None

    coordinate_text = expanded_url or message
    latitude, longitude = extract_coordinates_from_text(coordinate_text)

    try:
        llm_place = extract_place_with_llm(message)

        print("LLM PLACE EXTRACTION RESULT:")
        print(llm_place)

    except Exception as error:
        print("LLM PLACE EXTRACTION ERROR:")
        print(error)

        llm_place = {
            "place_name": clean_place_name(message),
            "description": message.strip(),
            "category": detect_place_category(message),
            "environment_tags": detect_environment_tags(message),
            "status": detect_place_status(message),
            "city": detect_city(message),
            "location_query": clean_place_name(message),
            "source_url": source_url,
            "confidence": 0.0,
        }

    place_name = llm_place.get("place_name") or clean_place_name(message)
    description = llm_place.get("description") or message.strip()
    category = llm_place.get("category") or detect_place_category(message)
    tags = llm_place.get("environment_tags") or detect_environment_tags(message)
    status = llm_place.get("status") or detect_place_status(message)
    city = llm_place.get("city") or detect_city(message)
    source_url = expanded_url or llm_place.get("source_url") or source_url

    geocode_query = llm_place.get("location_query") or place_name

    if city and city.lower() not in geocode_query.lower():
        geocode_query = f"{geocode_query}, {city}"

    if city and city.lower() not in geocode_query.lower():
        geocode_query = f"{geocode_query}, {city}"

    if city and city.lower() not in geocode_query.lower():
        geocode_query = f"{geocode_query}, {city}"

    geocode_result = {
        "location_known": False,
        "address": None,
        "latitude": None,
        "longitude": None,
    }

    if latitude is not None and longitude is not None:
        geocode_result = {
            "location_known": True,
            "address": None,
            "latitude": latitude,
            "longitude": longitude,
        }
    elif should_attempt_geocoding(message, city, category):
        geocode_result = geocode_place(geocode_query)

    photo_query = build_photo_query(place_name, category, tags, city)
    photo_result = search_pexels_photo(photo_query)

    place_record = {
        "user_id": user_id,
        "place_name": place_name,
        "description": message.strip(),
        "category": category,
        "environment_tags": tags,
        "status": status,
        "city": city,
        "address": geocode_result["address"],
        "latitude": geocode_result["latitude"],
        "longitude": geocode_result["longitude"],
        "source_url": expanded_url or source_url,
        "image_url": photo_result["image_url"],
        "image_source": photo_result["image_source"],
        "photo_credit": photo_result["photo_credit"],
        "location_known": geocode_result["location_known"],
        "visited": False,
        "reminder_enabled": True,
        "notes": message.strip(),
    }

    saved_place = save_place(place_record)

    if status == "favorite":
        response = f"Places Agent: Saved {place_name} as a favorite place."
    else:
        response = f"Places Agent: Saved {place_name} as a place you want to visit."

    if saved_place.get("location_known"):
        response += " I also found location details."

    if saved_place.get("image_url"):
        response += " I added a related photo."

    return {
        "response": response,
        "extracted_data": saved_place,
    }