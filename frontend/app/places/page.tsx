"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import {
  deletePlace as deletePlaceApi,
  getPlaces,
  updatePlace,
} from "@/lib/api";
import {
  PlaceCategoryFilter,
  PlaceItem,
  PlacesResponse,
  PlaceStatusFilter,
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
  const [placesData, setPlacesData] = useState<PlacesResponse | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<PlaceStatusFilter>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<PlaceCategoryFilter>("all");
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchPlaces("all", "all");
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-400">Places</p>
          <h1 className="text-3xl font-bold">Places Memory</h1>
          <p className="mt-2 text-slate-400">
            Save places you want to visit, favorite spots, map links, and
            travel ideas with photos and location details.
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

            <button
              onClick={() => fetchPlaces(selectedStatus, selectedCategory)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
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