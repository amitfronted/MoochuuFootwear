'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import SortOptions from '../components/SortOptions';
import ProductCard from '../components/ProductCard';
import { fetchAllProducts } from '../lib/api';
import Loader from '../components/Loader';

const ShopsContent = () => {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState('');
  const [productType, setProductType] = useState('');

  const sort = searchParams.get('sort') || '';

  // ==========================================
  // LOAD ALL PRODUCTS
  // ==========================================

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const filters = {};

        if (category) {
          filters.category = category;
        }

        if (productType) {
          filters.productType = productType;
        }

        if (sort) {
          filters.sort = sort;
        }

        const response = await fetchAllProducts(filters);

        if (response.success) {
          setProducts(response.data);

          // Initially show only 8
          setVisibleCount(8);
        } else {
          setProducts([]);
          setVisibleCount(8);
        }
      } catch (err) {
        console.error('Failed to load products:', err);

        setError('Failed to fetch products. Please try again.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category, productType, sort]);

  // ==========================================
  // INFINITE SCROLL
  // ==========================================

  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore) return;

      // All products already visible
      if (visibleCount >= products.length) {
        return;
      }

      const scrollPosition = window.innerHeight + window.scrollY;

      const documentHeight = document.documentElement.scrollHeight;

      // Load next 4 products
      if (documentHeight - scrollPosition < 300) {
        setLoadingMore(true);

        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + 4, products.length));

          setLoadingMore(false);
        }, 300);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loading, loadingMore, visibleCount, products.length]);

  // ==========================================
  // FILTER HANDLERS
  // ==========================================

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setVisibleCount(8);
  };

  const handleTypeChange = (e) => {
    setProductType(e.target.value);
    setVisibleCount(8);
  };

  // ==========================================
  // VISIBLE PRODUCTS
  // ==========================================

  const visibleProducts = products.slice(0, visibleCount);

  return (
    <>
      {/* Shop Banner */}
      <section className="relative h-40 sm:h-auto overflow-hidden">
        <Image
          src="/shop-thumbnail.png"
          alt="inner banner"
          width={1920}
          height={1020}
          sizes="100vw"
          className="w-full h-full sm:h-auto object-cover"
          loading="eager"
        />
      </section>

      {/* Shop Content */}
      <section className="p-4 pt-8 pb-24">
        {/* Header / Filters */}
        <div className="flex md:flex-row flex-col md:justify-between gap-4 md:gap-0 justify-start md:items-center items-end mb-12">
          <h4 className="text-xl font-semibold text-black w-full md:w-auto text-center md:text-left">
            {products.length} Products found
          </h4>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full md:w-auto">
            {/* Sort */}
            <div className="w-full sm:w-auto">
              <SortOptions />
            </div>

            {/* Category */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-start sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="text-md font-medium text-black">Category</label>

              <select
                value={category}
                onChange={handleCategoryChange}
                className="border p-2 sm:p-1 border-gray-600 rounded-md focus:outline-none w-full sm:w-auto bg-white"
              >
                <option value="">All Categories</option>

                <option value="men">Men</option>

                <option value="women">Women</option>

                <option value="child">Child</option>

                <option value="unisex">Unisex</option>
              </select>
            </div>

            {/* Type */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-start sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="text-md font-medium text-black">Type</label>

              <select
                value={productType}
                onChange={handleTypeChange}
                className="border p-2 sm:p-1 border-gray-600 rounded-md focus:outline-none w-full sm:w-auto bg-white"
              >
                <option value="">All Types</option>

                <option value="CUSTOMIZABLE">Customizable</option>

                <option value="STANDARD">Standard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products */}
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product._id}
                imgUrl={product.mainImage}
                id={product._id}
                hoverImage={product?.galleryImages?.[0] || ''}
                productName={product.name}
                price={product.basePrice}
              />
            ))}
          </div>
        )}

        {/* Loading More */}
        {loadingMore && (
          <div className="flex justify-center py-10">
            <Loader />
          </div>
        )}

        {/* End of Products */}
        {!loading &&
          !loadingMore &&
          products.length > 0 &&
          visibleCount >= products.length && (
            <div className="text-center py-10 text-gray-500">
              No more products
            </div>
          )}
      </section>
    </>
  );
};

const Shops = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader />
        </div>
      }
    >
      <ShopsContent />
    </Suspense>
  );
};

export default Shops;
