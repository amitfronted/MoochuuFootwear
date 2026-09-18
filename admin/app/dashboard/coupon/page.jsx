'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import {
  createCoupon,
  fetchCoupons,
  updateCoupon,
  deleteCoupon,
} from '../../lib/api';

const initialForm = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minimumOrderAmount: '0',
  maximumDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '1',
  expiresAt: '',
  isActive: true,
};

const formatDate = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const loadCoupons = async () => {
    try {
      setLoading(true);

      const response = await fetchCoupons();

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load coupons');
      }

      setCoupons(response?.data?.coupons || []);
    } catch (error) {
      console.error('LOAD COUPONS ERROR:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load coupons',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingCoupon(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error('Coupon code is required.');
      return;
    }

    if (!form.discountValue || Number(form.discountValue) <= 0) {
      toast.error('Discount value must be greater than 0.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minimumOrderAmount: Number(form.minimumOrderAmount || 0),
        maximumDiscountAmount:
          form.maximumDiscountAmount === ''
            ? null
            : Number(form.maximumDiscountAmount),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        perUserLimit: Number(form.perUserLimit || 1),
        expiresAt: form.expiresAt || null,
        isActive: Boolean(form.isActive),
      };

      let response;

      if (editingCoupon) {
        response = await updateCoupon(editingCoupon._id, payload);
      } else {
        response = await createCoupon(payload);
      }

      if (!response?.success) {
        throw new Error(
          response?.message ||
            `Failed to ${editingCoupon ? 'update' : 'create'} coupon`,
        );
      }

      toast.success(
        editingCoupon
          ? 'Coupon updated successfully'
          : 'Coupon created successfully',
      );

      resetForm();
      await loadCoupons();
    } catch (error) {
      console.error('SAVE COUPON ERROR:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to save coupon',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);

    setForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'PERCENTAGE',
      discountValue: coupon.discountValue ?? '',
      minimumOrderAmount: coupon.minimumOrderAmount ?? '0',
      maximumDiscountAmount: coupon.maximumDiscountAmount ?? '',
      usageLimit: coupon.usageLimit ?? '',
      perUserLimit: coupon.perUserLimit ?? '1',
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
        : '',
      isActive: coupon.isActive !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const response = await updateCoupon(coupon._id, {
        isActive: !coupon.isActive,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update coupon status');
      }

      toast.success(
        coupon.isActive ? 'Coupon deactivated' : 'Coupon activated',
      );

      await loadCoupons();
    } catch (error) {
      console.error('TOGGLE COUPON ERROR:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update coupon status',
      );
    }
  };

  const handleDelete = async (coupon) => {
    const confirmed = window.confirm(`Delete coupon "${coupon.code}"?`);

    if (!confirmed) return;

    try {
      const response = await deleteCoupon(coupon._id);

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to delete coupon');
      }

      toast.success('Coupon deleted successfully');

      if (editingCoupon?._id === coupon._id) {
        resetForm();
      }

      await loadCoupons();
    } catch (error) {
      console.error('DELETE COUPON ERROR:', error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete coupon',
      );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Coupons</h1>

        <p className="mt-1 text-gray-500">
          Create and manage discount coupons.
        </p>
      </div>

      {/* FORM */}
      <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
          </h2>

          {editingCoupon && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Coupon Code
            </label>

            <input
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="WELCOME10"
              className="w-full rounded-lg border px-3 py-2 uppercase outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Welcome discount"
              className="w-full rounded-lg border px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Discount Type
            </label>

            <select
              name="discountType"
              value={form.discountType}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Discount Value
            </label>

            <input
              name="discountValue"
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              onChange={handleChange}
              placeholder={form.discountType === 'PERCENTAGE' ? '10' : '200'}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Minimum Order Amount
            </label>

            <input
              name="minimumOrderAmount"
              type="number"
              min="0"
              value={form.minimumOrderAmount}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Maximum Discount
            </label>

            <input
              name="maximumDiscountAmount"
              type="number"
              min="0"
              value={form.maximumDiscountAmount}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Total Usage Limit
            </label>

            <input
              name="usageLimit"
              type="number"
              min="1"
              value={form.usageLimit}
              onChange={handleChange}
              placeholder="Unlimited"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Per User Limit
            </label>

            <input
              name="perUserLimit"
              type="number"
              min="1"
              value={form.perUserLimit}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Expiry Date
            </label>

            <input
              name="expiresAt"
              type="datetime-local"
              value={form.expiresAt}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 self-end pb-2">
            <input
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={handleChange}
            />

            <span className="text-sm font-medium">Active</span>
          </label>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-5 py-2.5 text-white disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingCoupon
                  ? 'Update Coupon'
                  : 'Create Coupon'}
            </button>

            {!editingCoupon && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-5 py-2.5"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* COUPON LIST */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold">All Coupons</h2>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-6 text-gray-500">No coupons created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-250">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm">
                  <th className="px-5 py-4">Code</th>
                  <th className="px-5 py-4">Discount</th>
                  <th className="px-5 py-4">Minimum</th>
                  <th className="px-5 py-4">Usage</th>
                  <th className="px-5 py-4">Expires</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-t text-sm">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{coupon.code}</div>

                      {coupon.description && (
                        <div className="mt-1 text-xs text-gray-500">
                          {coupon.description}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}%`
                        : `₹${coupon.discountValue}`}
                    </td>

                    <td className="px-5 py-4">
                      ₹{coupon.minimumOrderAmount || 0}
                    </td>

                    <td className="px-5 py-4">
                      {coupon.usedCount || 0}
                      {' / '}
                      {coupon.usageLimit ?? '∞'}
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(coupon.expiresAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          coupon.isActive
                            ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'
                            : 'rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700'
                        }
                      >
                        {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(coupon)}
                          className="rounded-lg border px-3 py-1.5"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon)}
                          className="rounded-lg border px-3 py-1.5"
                        >
                          {coupon.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(coupon)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
