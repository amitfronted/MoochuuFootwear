'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchAdminProducts,
  deleteProduct,
  updateProductStatus,
  checkProductActivation,
} from '../../lib/api';
import toast from 'react-hot-toast';

const Products = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [reviewProduct, setReviewProduct] = useState(null);
  const [activationChecks, setActivationChecks] = useState([]);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');

  const load = async () => {
    setLoading(true);

    try {
      const r = await fetchAdminProducts({
        ...(type && { productType: type }),
        ...(category && { category }),
        ...(status && { status }),
      });

      if (r.success) {
        setData(r.data || []);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type, category, status]);

  // -----------------------------------------
  // CHANGE PRODUCT STATUS
  // -----------------------------------------

  const changeStatus = async (product, newStatus) => {
    try {
      const r = await updateProductStatus(product._id, newStatus);

      if (r.success) {
        toast.success(r.message || `Product changed to ${newStatus}`);

        load();
      }
    } catch (e) {
      toast.error(
        e.response?.data?.message || 'Failed to update product status',
      );
    }
  };

  // -----------------------------------------
  // DELETE / ARCHIVE PRODUCT
  // -----------------------------------------

  const remove = async (p) => {
    if (!confirm(`Archive ${p.name}?`)) return;

    try {
      const r = await deleteProduct(p._id);

      if (r.success) {
        toast.success(r.message || 'Product archived successfully');

        load();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Archive failed');
    }
  };

  // -----------------------------------------
  // STATUS BADGE
  // -----------------------------------------

  const statusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      ARCHIVED: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  // -----------------------------------------
  // PRODUCT ACTIVATION REVIEW
  // -----------------------------------------

  const openActivationReview = async (product) => {
    setReviewProduct(product);
    setActivationChecks([]);
    setActivationError('');
    setActivationLoading(true);

    try {
      const r = await checkProductActivation(product._id);

      if (r.success) {
        setActivationChecks(r.data?.checks || []);
      } else {
        setActivationError(r.message || 'Unable to check product readiness.');
      }
    } catch (e) {
      setActivationError(
        e.response?.data?.message || 'Unable to check product readiness.',
      );
    } finally {
      setActivationLoading(false);
    }
  };

  const closeActivationReview = () => {
    setReviewProduct(null);
    setActivationChecks([]);
    setActivationError('');
  };

  const confirmActivation = async () => {
    if (!reviewProduct) return;

    const failedChecks = activationChecks.filter((check) => !check.passed);

    if (failedChecks.length > 0) {
      toast.error('Complete all required checks before activation.');
      return;
    }

    try {
      setActivationLoading(true);

      const r = await updateProductStatus(reviewProduct._id, 'ACTIVE');

      if (r.success) {
        toast.success(r.message || 'Product activated successfully');
        closeActivationReview();
        load();
      }
    } catch (e) {
      toast.error(
        e.response?.data?.message || 'Product could not be activated.',
      );
    } finally {
      setActivationLoading(false);
    }
  };

  // -----------------------------------------
  // STATUS CHANGE
  // -----------------------------------------

  const handleStatusChange = async (product, newStatus) => {
    if (newStatus === product.status) return;

    // Activation must always go through the readiness review.
    if (newStatus === 'ACTIVE') {
      await openActivationReview(product);
      return;
    }

    const confirmMessage =
      newStatus === 'INACTIVE'
        ? `Deactivate ${product.name}?`
        : `Archive ${product.name}?`;

    if (!confirm(confirmMessage)) return;

    try {
      const r = await updateProductStatus(product._id, newStatus);

      if (r.success) {
        toast.success(r.message || 'Product status updated');
        load();
      }
    } catch (e) {
      toast.error(
        e.response?.data?.message || 'Failed to update product status',
      );
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}

        <div className="flex flex-wrap justify-between gap-3 items-center">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>

            <p className="text-sm text-slate-500">
              Manage all footwear products.
            </p>
          </div>

          <Link
            href="/dashboard/products/add-product"
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            + Add Product
          </Link>
        </div>

        {/* FILTERS */}

        <div className="rounded-xl flex flex-wrap gap-3 items-center justify-end">
          {/* CATEGORY */}

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
            className="border rounded-lg p-2"
          >
            <option value="">All Categories</option>

            <option value="men">Men</option>

            <option value="women">Women</option>

            <option value="child">Child</option>

            <option value="unisex">Unisex</option>
          </select>

          {/* TYPE */}

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
            }}
            className="border rounded-lg p-2"
          >
            <option value="">All Types</option>

            <option value="CUSTOMIZABLE">Customizable</option>

            <option value="STANDARD">Standard</option>
          </select>

          {/* STATUS */}

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
            }}
            className="border rounded-lg p-2"
          >
            <option value="">All Status</option>

            <option value="DRAFT">Draft</option>

            <option value="ACTIVE">Active</option>

            <option value="INACTIVE">Inactive</option>

            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* PRODUCT TABLE */}

        <div className="bg-white border rounded-xl overflow-x-auto mt-6">
          <table className="w-full max-w-7xl mx-auto">
            <thead className="text-slate-900 text-left text-sm font-semibold border-b border-slate-300 whitespace-nowrap">
              <tr className="border-b bg-slate-50">
                <th scope="col" className="px-3 py-3.5" width={350}>
                  Product
                </th>

                <th scope="col" className="px-3 py-3.5">
                  Code
                </th>

                <th scope="col" className="px-3 py-3.5">
                  Category
                </th>

                <th scope="col" className="px-3 py-3.5">
                  Type
                </th>

                <th scope="col" className="px-3 py-3.5">
                  Price
                </th>

                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>

                <th scope="col" className="px-3 py-3.5">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="text-sm divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                data.map((p) => (
                  <tr key={p._id} className="border-b">
                    {/* PRODUCT */}

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.mainImage}
                          alt={p.name}
                          className="w-14 h-14 rounded-lg object-contain border"
                        />

                        <div>
                          <b>{p.name}</b>

                          <div className="text-xs text-slate-500 max-w-xs truncate">
                            {p.description || ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CODE */}

                    <td className="p-4">{p.productCode}</td>

                    {/* CATEGORY */}

                    <td className="capitalize p-4">{p.category}</td>

                    {/* TYPE */}

                    <td className="p-4">{p.productType}</td>

                    {/* PRICE */}

                    <td className="p-4">
                      ₹{Number(p.basePrice || 0).toLocaleString('en-IN')}
                    </td>

                    {/* STATUS */}

                    <td className="p-4">
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p, e.target.value)}
                        disabled={p.status === 'ARCHIVED'}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium
      ${
        p.status === 'ACTIVE'
          ? 'bg-green-50 text-green-700 border-green-200'
          : p.status === 'DRAFT'
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
            : p.status === 'INACTIVE'
              ? 'bg-gray-50 text-gray-700 border-gray-200'
              : 'bg-red-50 text-red-700 border-red-200'
      }`}
                      >
                        {p.status === 'DRAFT' && (
                          <>
                            <option value="DRAFT">Draft</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </>
                        )}

                        {p.status === 'ACTIVE' && (
                          <>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </>
                        )}

                        {p.status === 'INACTIVE' && (
                          <>
                            <option value="INACTIVE">Inactive</option>
                            <option value="ACTIVE">Active</option>
                            <option value="ARCHIVED">Archived</option>
                          </>
                        )}

                        {p.status === 'ARCHIVED' && (
                          <option value="ARCHIVED">Archived</option>
                        )}
                      </select>
                    </td>

                    {/* ACTIONS */}

                    <td className="p-4">
                      <div className="flex flex-wrap gap-3 items-center">
                        <Link
                          className="text-blue-600 hover:underline"
                          href={`/dashboard/products/edit/${p._id}`}
                        >
                          Edit
                        </Link>

                        {p.status === 'ACTIVE' && (
                          <Link
                            className="text-emerald-600 hover:underline"
                            href={`/dashboard/stock/${p._id}`}
                          >
                            Stock
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------- */}
      {/* ACTIVATION REVIEW MODAL */}
      {/* ----------------------------------------- */}

      {reviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-120 overflow-x-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Review Product Before Activation
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Confirm that the product is complete before making it visible
                  on the storefront.
                </p>
              </div>

              <button
                type="button"
                onClick={closeActivationReview}
                disabled={activationLoading}
                className="text-2xl text-slate-400 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-4 rounded-xl border bg-slate-50 p-4 mb-5">
                <img
                  src={reviewProduct.mainImage}
                  alt={reviewProduct.name}
                  className="h-20 w-20 rounded-lg border bg-white object-contain"
                />

                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900">
                    {reviewProduct.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {reviewProduct.productCode}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                      {reviewProduct.productType}
                    </span>
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">
                      {reviewProduct.status}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                      ₹
                      {Number(reviewProduct.basePrice || 0).toLocaleString(
                        'en-IN',
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {activationLoading && activationChecks.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  Checking product configuration...
                </div>
              ) : activationError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {activationError}
                </div>
              ) : (
                <div className="space-y-3">
                  {activationChecks.map((check) => (
                    <div
                      key={check.key}
                      className={`rounded-xl border p-2 ${
                        check.passed
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            check.passed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {check.passed ? '✓' : '!'}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {check.label}
                          </p>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {check.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeActivationReview}
                disabled={activationLoading}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmActivation}
                disabled={
                  activationLoading ||
                  activationChecks.length === 0 ||
                  activationChecks.some((check) => !check.passed)
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activationLoading ? 'Processing...' : 'Activate Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
