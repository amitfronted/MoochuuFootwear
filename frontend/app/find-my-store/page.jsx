'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchAllStores } from '../lib/api';

const StoreMap = dynamic(() => import('@/app/components/StoreMap'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-105 items-center justify-center bg-gray-100">
      Loading map...
    </div>
  ),
});

const FindMyStore = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAllStores();
      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || 'Unable to load store locations.');
      }
      setStores(result.data);
      setSelectedStore((current) => {
        if (current && result.data.some((store) => store._id === current._id)) {
          return result.data.find((store) => store._id === current._id);
        }
        return result.data[0] || null;
      });
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Unable to load stores.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((store) =>
      [store.name, store.address, store.city, store.state, store.pincode].some(
        (value) =>
          String(value || '')
            .toLowerCase()
            .includes(term),
      ),
    );
  }, [stores, search]);

  useEffect(() => {
    if (!filteredStores.length) {
      setSelectedStore(null);
      return;
    }
    if (
      !selectedStore ||
      !filteredStores.some((store) => store._id === selectedStore._id)
    ) {
      setSelectedStore(filteredStores[0]);
    }
  }, [filteredStores, selectedStore]);

  return (
    <div className="bg-white text-neutral-900">
      <section className="bg-[#fff200] px-4 py-12 text-center sm:py-16">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em]">
          Moo Chuu Footwear
        </p>
        <h1 className="text-3xl font-bold uppercase sm:text-5xl">
          Find Your Store
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base">
          Visit us in person. Find store details, explore the map, and get
          directions.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Our Store Locations</h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by store name, city, address or pincode.
            </p>
          </div>
          <label className="block w-full sm:max-w-sm">
            <span className="sr-only">Search store locations</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search city or pincode..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={loadStores}
              className="self-start font-semibold underline sm:self-auto"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">
            Loading store locations...
          </div>
        ) : !error && stores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center">
            <h3 className="text-xl font-semibold">No stores available yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Please check back soon for store locations.
            </p>
          </div>
        ) : !error && filteredStores.length === 0 ? (
          <div className="rounded-xl border border-gray-200 px-6 py-16 text-center">
            <h3 className="text-lg font-semibold">No matching stores</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try another store name, city or pincode.
            </p>
          </div>
        ) : (
          !error && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="mb-3 text-sm text-gray-500">
                  {filteredStores.length}{' '}
                  {filteredStores.length === 1 ? 'store' : 'stores'} found
                </p>
                <div className="space-y-3 lg:max-h-162.5 lg:overflow-y-auto lg:pr-2">
                  {filteredStores.map((store) => {
                    const isSelected = selectedStore?._id === store._id;
                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${store.latitude},${store.longitude}`)}`;
                    return (
                      <article
                        key={store._id}
                        className={`rounded-xl border p-4 transition sm:p-5 ${isSelected ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-200 hover:border-gray-400'}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedStore(store)}
                          className="block w-full text-left"
                          aria-pressed={isSelected}
                        >
                          <span className="flex items-start gap-3">
                            <span
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white"
                              aria-hidden="true"
                            >
                              M
                            </span>
                            <span className="min-w-0">
                              <span className="block font-bold">
                                {store.name}
                              </span>
                              <span className="mt-1 block text-sm leading-6 text-gray-600">
                                {store.address}, {store.city}, {store.state}
                                {store.pincode ? ` - ${store.pincode}` : ''}
                              </span>
                            </span>
                          </span>
                          <span className="mt-4 block space-y-1 text-sm text-gray-700">
                            <span className="block">
                              <strong>Hours:</strong>{' '}
                              {store.openingTime || 'Hours not listed'}
                              {store.closingTime
                                ? ` – ${store.closingTime}`
                                : ''}
                            </span>
                            {Array.isArray(store.openingDays) &&
                              store.openingDays.length > 0 && (
                                <span className="block text-gray-500">
                                  {store.openingDays.join(', ')}
                                </span>
                              )}
                            {store.phone && (
                              <span className="block">
                                <strong>Phone:</strong> {store.phone}
                              </span>
                            )}
                          </span>
                        </button>
                        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStore(store)}
                            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                          >
                            View on map
                          </button>
                          <Link
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold underline underline-offset-4"
                          >
                            Get directions
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
              <div className="h-105 overflow-hidden rounded-xl border border-gray-200 sm:h-137.5 lg:h-162.5 z-30">
                <StoreMap
                  stores={filteredStores}
                  selectedStore={selectedStore}
                  onSelectStore={setSelectedStore}
                />
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default FindMyStore;
