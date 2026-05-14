"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import AppShell from "@/components/layout/AppShell";
import {
  deletePlace as deletePlaceApi,
  getNearbyPlaces,
  getPlaces,
  getPlacesWithDistances,
  getPlaceSuggestions,
  updatePlace,
} from "@/lib/api";

import {
  NearbyPlacesResponse,
  PlaceCategoryFilter,
  PlaceItem,
  PlacesResponse,
  PlaceStatusFilter,
  PlaceSuggestionsResponse,
} from "@/lib/types";

const statusOptions: { label: string; value: PlaceStatusFilter }[] = [
  { label: "All Places", value: "all" },
  { label: "Want to Visit", value: "want_to_visit" },
  { label: "Favorites", value: "favorite" },
];

const categoryOptions: { label: string; value: PlaceCategoryFilter }[] = [
  { label: "All Categories", value: "all" },
  { label: "Ocean", value: "ocean" },
  { label: "Mountain", value: "mountain" },
  { label: "Desert", value: "desert" },
  { label: "Adventure", value: "adventure" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Movie", value: "movie" },
  { label: "Park", value: "park" },
  { label: "City", value: "city" },
  { label: "Shopping", value: "shopping" },
  { label: "Travel", value: "travel" },
  { label: "General", value: "general" },
];

function statusLabel(status: string) {
  return status === "favorite" ? "Favorite" : "Want to Visit";
}

function placeImage(place: PlaceItem) {
  return place.image_url;
}

export default function PlacesPage() {
  const router = useRouter();
  const [placesData, setPlacesData] = useState<PlacesResponse | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<PlaceStatusFilter>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<PlaceCategoryFilter>("all");
  const [loading, setLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlacesResponse | null>(
  null
  );
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(10);
  const [placeSuggestions, setPlaceSuggestions] =
    useState<PlaceSuggestionsResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  async function fetchPlaces(
    status: PlaceStatusFilter = selectedStatus,
    category: PlaceCategoryFilter = selectedCategory
  ) {
    setLoading(true);

    try {
      const data = await getPlaces({
        status,
        category,
      });

      setPlacesData(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch places.");
    } finally {
      setLoading(false);
    }
  }

  async function checkNearbyPlaces() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setNearbyLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await getNearbyPlaces({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusKm: nearbyRadiusKm,
          });

          setNearbyPlaces(data);
        } catch (error) {
          console.error(error);
          alert("Failed to check nearby places.");
        } finally {
          setNearbyLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);

        setNearbyLoading(false);

        let message = "Unable to get your location.";

        if (error.code === 1) {
          message =
            "Location permission was denied. Please allow location access in your browser settings.";
        } else if (error.code === 2) {
          message =
            "Your location is unavailable. Make sure Windows location services are turned on.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Try again or increase the timeout.";
        }

        alert(message);
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 300000,
      }
    );
  }

  async function calculateAllPlaceDistances() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await getPlacesWithDistances({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setPlacesData({
            status: data.status,
            user_id: data.user_id,
            count: data.count,
            places: data.places,
          });
        } catch (error) {
          console.error(error);
          alert("Failed to calculate distances.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoading(false);
        alert("Unable to get your current location.");
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 300000,
      }
    );
  }



  async function handleStatusChange(status: PlaceStatusFilter) {
    setSelectedStatus(status);
    await fetchPlaces(status, selectedCategory);
  }

  async function handleCategoryChange(category: PlaceCategoryFilter) {
    setSelectedCategory(category);
    await fetchPlaces(selectedStatus, category);
  }

  async function markVisited(place: PlaceItem) {
    try {
      await updatePlace(place.id, {
        visited: true,
        visited_at: new Date().toISOString(),
      });

      await fetchPlaces(selectedStatus, selectedCategory);
    } catch (error) {
      console.error(error);
      alert("Failed to mark place as visited.");
    }
  }

  async function toggleFavorite(place: PlaceItem) {
    const newStatus =
      place.status === "favorite" ? "want_to_visit" : "favorite";

    try {
      await updatePlace(place.id, {
        status: newStatus,
      });

      await fetchPlaces(selectedStatus, selectedCategory);
    } catch (error) {
      console.error(error);
      alert("Failed to update place status.");
    }
  }

  async function deletePlace(placeId: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this place?"
    );

    if (!confirmDelete) return;

    try {
      await deletePlaceApi(placeId);
      await fetchPlaces(selectedStatus, selectedCategory);
    } catch (error) {
      console.error(error);
      alert("Failed to delete place.");
    }
  }

  async function fetchPlaceSuggestions() {
    setSuggestionsLoading(true);

    try {
      const data = await getPlaceSuggestions(0);
      setPlaceSuggestions(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch place suggestions.");
    } finally {
      setSuggestionsLoading(false);
    }
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      await fetchPlaces("all", "all");
      await fetchPlaceSuggestions();
    }

    loadPage();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Saved Places</h1>
          <p className="mt-2 text-slate-400">
            Save favorite places, travel ideas, map links, photos, and location reminders.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Filters</h2>
              <p className="mt-2 text-slate-400">
                Filter by visit status and place category.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fetchPlaces(selectedStatus, selectedCategory)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Refresh
              </button>

              <button
                onClick={calculateAllPlaceDistances}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Show Distance on All Cards
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(event) =>
                  handleStatusChange(event.target.value as PlaceStatusFilter)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(event) =>
                  handleCategoryChange(
                    event.target.value as PlaceCategoryFilter
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>


        {/* Nearby Places */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-medium text-blue-400">Nearby Reminder</p>
              <h2 className="text-2xl font-bold">Check Nearby Saved Places</h2>
              <p className="mt-2 text-slate-400">
                Allow location access to find saved places near you while the app is open.
              </p>
            </div>

            <button
              onClick={checkNearbyPlaces}
              disabled={nearbyLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {nearbyLoading ? "Checking..." : "Check Nearby Places"}
            </button>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm text-slate-400">
              Search Radius: {nearbyRadiusKm} km
            </label>

            <input
              type="range"
              min="1"
              max="50"
              value={nearbyRadiusKm}
              onChange={(event) => setNearbyRadiusKm(Number(event.target.value))}
              className="w-full"
            />
          </div>

          {nearbyPlaces && (
            <div>
              <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Nearby Found</span>
                  <span>{nearbyPlaces.count}</span>
                </div>

                <div className="mt-2 flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Radius</span>
                  <span>{nearbyPlaces.radius_km} km</span>
                </div>
              </div>

              {nearbyPlaces.places.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {nearbyPlaces.places.map((place) => (
                    <div
                      key={`nearby-${place.id}`}
                      className="rounded-xl border border-blue-500/40 bg-slate-800 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{place.place_name}</p>
                          <p className="mt-1 text-sm capitalize text-slate-400">
                            {place.category ?? "general"} · {place.status.replace("_", " ")}
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs">
                          {place.distance_km ?? "?"} km
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        This saved place is nearby. Do you want to visit or try it?
                      </p>

                      {place.address && (
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {place.address}
                        </p>
                      )}

                      {place.source_url && (
                        <a
                          href={place.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          Open Link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">
                  No saved places found nearby within this radius.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-medium text-blue-400">Suggestions</p>
              <h2 className="text-2xl font-bold">Places You Saved Earlier</h2>
              <p className="mt-2 text-slate-400">
                Places you saved but have not visited yet.
              </p>
            </div>

            <button
              onClick={fetchPlaceSuggestions}
              disabled={suggestionsLoading}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {suggestionsLoading ? "Checking..." : "Refresh Suggestions"}
            </button>
          </div>

          {suggestionsLoading ? (
            <p className="text-slate-400">Loading suggestions...</p>
          ) : placeSuggestions && placeSuggestions.places.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {placeSuggestions.places.slice(0, 4).map((place) => (
                <div
                  key={`suggestion-${place.id}`}
                  className="rounded-xl border border-orange-500/40 bg-slate-800 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{place.place_name}</p>
                      <p className="mt-1 text-sm capitalize text-slate-400">
                        {place.category ?? "general"} · {place.status.replace("_", " ")}
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-600 px-3 py-1 text-xs">
                      Saved
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">
                    You saved this place earlier. Still want to visit or try it?
                  </p>

                  {place.image_url && (
                    <img
                      src={place.image_url}
                      alt={place.place_name}
                      className="mt-4 h-36 w-full rounded-xl object-cover"
                    />
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!place.visited && (
                      <button
                        onClick={() => markVisited(place)}
                        className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                      >
                        Mark Visited
                      </button>
                    )}

                    {place.source_url && (
                      <a
                        href={place.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Open Link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">
              No saved-place suggestions right now.
            </p>
          )}
        </section>



        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400">
                Saved Places
              </p>
              <h2 className="text-2xl font-bold">
                {placesData?.count ?? 0} place(s)
              </h2>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading places...</p>
          ) : placesData && placesData.places.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {placesData.places.map((place) => (
                <div
                  key={place.id}
                  className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800"
                >
                  {placeImage(place) ? (
                    <img
                      src={placeImage(place) ?? ""}
                      alt={place.place_name}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-slate-900 text-slate-500">
                      No image found
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">
                          {place.place_name}
                        </h3>
                        <p className="mt-1 text-sm capitalize text-slate-400">
                          {place.category ?? "general"} ·{" "}
                          {statusLabel(place.status)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          place.visited
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {place.visited ? "Visited" : "Not visited"}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-slate-300">
                      {place.description ?? place.notes ?? "No notes"}
                    </p>

                    {place.environment_tags &&
                      place.environment_tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {place.environment_tags.map((tag) => (
                            <span
                              key={`${place.id}-${tag}`}
                              className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-400">Distance</span>
                        <span className="text-right">
                          {place.distance_km != null
                            ? `${place.distance_km} km away`
                            : "Location unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-400">Location</span>
                        <span className="text-right">
                          {place.location_known ? "Known" : "Unknown"}
                        </span>
                      </div>

                      {place.city && (
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">City</span>
                          <span className="text-right">{place.city}</span>
                        </div>
                      )}

                      {place.address && (
                        <div>
                          <p className="text-slate-400">Address</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">
                            {place.address}
                          </p>
                        </div>
                      )}

                      {place.photo_credit && (
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">Photo</span>
                          <span className="text-right text-xs">
                            Pexels / {place.photo_credit}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {!place.visited && (
                        <button
                          onClick={() => markVisited(place)}
                          className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                        >
                          Mark Visited
                        </button>
                      )}

                      <button
                        onClick={() => toggleFavorite(place)}
                        className="rounded-lg border border-blue-500/40 px-3 py-1 text-xs text-blue-300 hover:bg-blue-500/10"
                      >
                        {place.status === "favorite"
                          ? "Move to Want"
                          : "Favorite"}
                      </button>

                      {place.source_url && (
                        <a
                          href={place.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          Open Link
                        </a>
                      )}

                      <button
                        onClick={() => deletePlace(place.id)}
                        className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      Saved: {new Date(place.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">
              No places found. Use the Chat page to save places like: “I want to
              visit Central Park in New York.”
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}