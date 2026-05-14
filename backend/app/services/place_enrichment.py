import os
import re
from typing import Any, Dict, Optional
from urllib.parse import quote_plus

import httpx
from dotenv import load_dotenv

load_dotenv()

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")


def extract_url(message: str) -> Optional[str]:
    """
    Extracts first URL from the user message.
    Supports Google Maps links and normal URLs.
    """

    url_pattern = r"https?://[^\s]+"
    match = re.search(url_pattern, message)

    if not match:
        return None

    return match.group(0).strip()


def extract_coordinates_from_text(text: str) -> tuple[Optional[float], Optional[float]]:
    """
    Tries to extract latitude/longitude from map-like URLs or text.

    Common Google Maps format:
    https://www.google.com/maps/place/.../@33.749,-84.388,17z
    """

    patterns = [
        r"@(-?\d+\.\d+),(-?\d+\.\d+)",
        r"q=(-?\d+\.\d+),(-?\d+\.\d+)",
        r"ll=(-?\d+\.\d+),(-?\d+\.\d+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if match:
            return float(match.group(1)), float(match.group(2))

    return None, None


def expand_short_url(url: str) -> str:
    """
    Attempts to expand short Google Maps URLs.
    If expansion fails, returns the original URL.
    """

    try:
        with httpx.Client(follow_redirects=True, timeout=8.0) as client:
            response = client.get(url)
            return str(response.url)
    except Exception:
        return url


def geocode_place(query: str) -> Dict[str, Any]:
    """
    Uses OpenStreetMap Nominatim to geocode a place query.
    Returns address, latitude, and longitude when available.
    """

    if not query.strip():
        return {
            "location_known": False,
            "address": None,
            "latitude": None,
            "longitude": None,
        }

    encoded_query = quote_plus(query)

    url = (
        "https://nominatim.openstreetmap.org/search"
        f"?q={encoded_query}&format=json&limit=1&addressdetails=1"
    )

    headers = {
        "User-Agent": "LifeOS-AI-Assistant/0.1 contact@example.com"
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            results = response.json()

        if not results:
            return {
                "location_known": False,
                "address": None,
                "latitude": None,
                "longitude": None,
            }

        first_result = results[0]

        return {
            "location_known": True,
            "address": first_result.get("display_name"),
            "latitude": float(first_result["lat"]),
            "longitude": float(first_result["lon"]),
        }

    except Exception:
        return {
            "location_known": False,
            "address": None,
            "latitude": None,
            "longitude": None,
        }


def search_pexels_photo(query: str) -> Dict[str, Optional[str]]:
    """
    Searches Pexels for a relevant photo.
    If PEXELS_API_KEY is missing or no image is found, returns None values.
    """

    if not PEXELS_API_KEY:
        return {
            "image_url": None,
            "image_source": None,
            "photo_credit": None,
        }

    if not query.strip():
        return {
            "image_url": None,
            "image_source": None,
            "photo_credit": None,
        }

    url = "https://api.pexels.com/v1/search"

    headers = {
        "Authorization": PEXELS_API_KEY,
    }

    params = {
        "query": query,
        "per_page": 1,
        "orientation": "landscape",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

        photos = data.get("photos", [])

        if not photos:
            return {
                "image_url": None,
                "image_source": None,
                "photo_credit": None,
            }

        photo = photos[0]

        return {
            "image_url": photo.get("src", {}).get("large"),
            "image_source": "pexels",
            "photo_credit": photo.get("photographer"),
        }

    except Exception:
        return {
            "image_url": None,
            "image_source": None,
            "photo_credit": None,
        }