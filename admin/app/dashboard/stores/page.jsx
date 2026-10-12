'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import {
  createStore,
  deleteStore,
  fetchAllStoresAdmin,
  updateStore,
  updateStoreStatus,
} from '@/app/lib/api';

const StoreMapPicker = dynamic(
  () => import('@/app/components/StoreLocation/StoreMapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
        Loading map picker...
      </div>
    ),
  },
);

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const emptyForm = () => ({
  name: '',
  address: '',
  city: '',
  state: 'Uttar Pradesh',
  pincode: '',
  phone: '',
  email: '',
  openingTime: '10:00 AM',
  closingTime: '09:00 PM',
  openingDays: [...DAYS],
  latitude: '',
  longitude: '',
});

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

export default function StoreManagementPage() {
  const [stores, setStores] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAllStoresAdmin(
        statusFilter ? { status: statusFilter } : {},
      );
      if (!result?.success)
        throw new Error(result?.message || 'Unable to load stores.');
      setStores(result.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to load stores.',
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const visibleStores = useMemo(() => {
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

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };
  const startEdit = (store) => {
    setEditingId(store._id);
    setForm({
      name: store.name || '',
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      pincode: store.pincode || '',
      phone: store.phone || '',
      email: store.email || '',
      openingTime: store.openingTime || '10:00 AM',
      closingTime: store.closingTime || '09:00 PM',
      openingDays: Array.isArray(store.openingDays)
        ? store.openingDays
        : [...DAYS],
      latitude: String(store.latitude ?? ''),
      longitude: String(store.longitude ?? ''),
    });
    setFormOpen(true);
  };

  const changeField = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const setCoordinates = ({ latitude, longitude }) =>
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(7),
      longitude: longitude.toFixed(7),
    }));
  const toggleDay = (day) =>
    setForm((current) => ({
      ...current,
      openingDays: current.openingDays.includes(day)
        ? current.openingDays.filter((item) => item !== day)
        : [...current.openingDays, day],
    }));

  const submitForm = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    };
    if (
      !payload.name.trim() ||
      !payload.address.trim() ||
      !payload.city.trim() ||
      !payload.state.trim()
    ) {
      toast.error('Please complete the store name and address fields.');
      return;
    }
    if (
      form.latitude === '' ||
      form.longitude === '' ||
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude) ||
      payload.latitude < -90 ||
      payload.latitude > 90 ||
      payload.longitude < -180 ||
      payload.longitude > 180
    ) {
      toast.error(
        'Choose a valid location on the map or enter valid coordinates.',
      );
      return;
    }
    setSaving(true);
    try {
      const result = editingId
        ? await updateStore(editingId, payload)
        : await createStore(payload);
      if (!result?.success)
        throw new Error(result?.message || 'Unable to save store.');
      toast.success(result.message || 'Store saved successfully.');
      setFormOpen(false);
      await loadStores();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to save store.',
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (store) => {
    const nextStatus = store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const result = await updateStoreStatus(store._id, nextStatus);
      if (!result?.success)
        throw new Error(result?.message || 'Unable to update status.');
      toast.success(result.message || `Store ${nextStatus.toLowerCase()}.`);
      await loadStores();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to update status.',
      );
    }
  };

  const archiveStore = async (store) => {
    if (
      !window.confirm(
        `Archive "${store.name}"? It will no longer be shown to customers.`,
      )
    )
      return;
    try {
      const result = await deleteStore(store._id);
      if (!result?.success)
        throw new Error(result?.message || 'Unable to archive store.');
      toast.success('Store archived.');
      await loadStores();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to archive store.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Locations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer-facing store addresses and map coordinates.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          + Add Store
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, address, city or pincode"
          className={inputClass}
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={inputClass}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {formOpen && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Store' : 'Add Store'}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <form onSubmit={submitForm} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ['name', 'Store name', 'text'],
                ['address', 'Street address', 'text'],
                ['city', 'City', 'text'],
                ['state', 'State', 'text'],
                ['pincode', 'Pincode', 'text'],
                ['phone', 'Phone', 'tel'],
                ['email', 'Email', 'email'],
                ['openingTime', 'Opening time', 'text'],
                ['closingTime', 'Closing time', 'text'],
              ].map(([name, label, type]) => (
                <label key={name}>
                  <span className={labelClass}>
                    {label}
                    {['name', 'address', 'city', 'state'].includes(name)
                      ? ' *'
                      : ''}
                  </span>
                  <input
                    name={name}
                    type={type}
                    value={form[name]}
                    onChange={changeField}
                    className={inputClass}
                    required={['name', 'address', 'city', 'state'].includes(
                      name,
                    )}
                  />
                </label>
              ))}
            </div>
            <div>
              <p className={labelClass}>Opening days</p>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.openingDays.includes(day)}
                      onChange={() => toggleDay(day)}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Latitude *</span>
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={changeField}
                  className={inputClass}
                  required
                />
              </label>
              <label>
                <span className={labelClass}>Longitude *</span>
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={changeField}
                  className={inputClass}
                  required
                />
              </label>
            </div>
            <StoreMapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={setCoordinates}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Create Store'}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading stores...
          </div>
        ) : visibleStores.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No stores found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleStores.map((store) => (
                  <tr key={store._id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">
                        {store.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {store.phone || store.email || 'No contact details'}
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-gray-600">
                      {store.address}, {store.city}, {store.state}{' '}
                      {store.pincode}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {store.openingTime} – {store.closingTime}
                      <p className="mt-1 max-w-48 text-xs text-gray-400">
                        {store.openingDays?.join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${store.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : store.status === 'INACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {store.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={store.status === 'ARCHIVED'}
                          onClick={() => startEdit(store)}
                          className="rounded border px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40"
                        >
                          Edit
                        </button>
                        {store.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => changeStatus(store)}
                            className="rounded border px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50"
                          >
                            {store.status === 'ACTIVE'
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>
                        )}
                        {store.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => archiveStore(store)}
                            className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
