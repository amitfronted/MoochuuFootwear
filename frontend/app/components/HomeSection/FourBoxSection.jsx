'use client';

import React, { useEffect, useState } from 'react';

import ProductCard from '../ProductCard';
import { fetchAllProducts } from '../../lib/api';
import Loader from '../Loader';

const FourBoxSection = ({ title, subtitle, categories = [] }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        let allProducts = [];

        // Fetch products for each category
        for (const category of categories) {
          const response = await fetchAllProducts({
            page: 1,
            limit: 4,
            category,
          });

          if (response.success && response.data?.length) {
            allProducts = [...allProducts, ...response.data];
          }
        }

        // Remove duplicate products
        const uniqueProducts = Array.from(
          new Map(
            allProducts.map((product) => [product._id, product]),
          ).values(),
        );

        // Only show 4 products
        setProducts(uniqueProducts.slice(0, 4));
      } catch (err) {
        console.error('Failed to load products:', err);
        setError('Failed to load products.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [categories]);

  return (
    <section className="px-4 py-16 sm:py-20 lg:py-24">
      {/* Section Heading */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 lg:mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-black">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Products */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No products available.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 max-w-[1600px] mx-auto">
          {products.map((product) => (
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
    </section>
  );
};

export default FourBoxSection;
