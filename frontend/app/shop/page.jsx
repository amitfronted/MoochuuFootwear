'use client';
import React, { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import SortOptions from '../components/SortOptions';
import ProductCard from '../components/ProductCard';
import { fetchAllProducts } from '../lib/api';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

const ShopsContent = () => {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [category, setCategory] = useState('');
  const [productType, setProductType] = useState('');

  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Read sort parameter directly from searchParams
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = { page, limit: 8 };
        if (category) filters.category = category;
        if (productType) filters.productType = productType;
        if (sort) filters.sort = sort;

        const response = await fetchAllProducts(filters);
        if (response.success) {
          setProducts(response.data);
          setTotalPages(response.totalPages);
          setTotalProducts(response.total);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        setError('Failed to fetch products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category, productType, sort, page]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1); // Reset to page 1 on filter change
  };

  const handleTypeChange = (e) => {
    setProductType(e.target.value);
    setPage(1); // Reset to page 1 on filter change
  };

  return (
    <>
      <section className="relative">
        <Image
          src="/shopBanner2.png"
          alt="inner banner"
          width={1920}
          height={1020}
          sizes="100vw"
          className="w-full h-auto"
          loading="eager"
        />
      </section>

      <section className="bg-[#fdea07] p-4 pt-8 pb-24">
        <div className="flex md:flex-row flex-col md:justify-between gap-4 md:gap-0 justify-start md:items-center items-end mb-12">
          <h4 className="text-xl font-semibold text-black w-full md:w-auto text-center md:text-left">
            {totalProducts} Products found
          </h4>

          <div className="flex flex-wrap gap-4">
            <SortOptions />

            <div className="flex items-center justify-end gap-3">
              <label className="text-md font-medium text-black">Category</label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="border p-1 border-gray-600 rounded-md focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="child">Child</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <label className="text-md font-medium text-black">Type</label>
              <select
                value={productType}
                onChange={handleTypeChange}
                className="border p-1 border-gray-600 rounded-md focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="CUSTOMIZABLE">Customizable</option>
                <option value="STANDARD">Standard</option>
              </select>
            </div>
          </div>
        </div>

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
            {products.map((product) => (
              <ProductCard
                key={product._id}
                imgUrl={product.mainImage}
                id={product._id}
                productName={product.name}
                price={product.basePrice}
              />
            ))}
          </div>
        )}

        {/* Dynamic Pagination Component */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalResults={totalProducts}
            limit={8}
            onPageChange={(newPage) => setPage(newPage)}
          />
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
