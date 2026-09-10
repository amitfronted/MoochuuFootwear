import React from 'react';
import MainHeading from '../Common/MainHeading';
import ProductCard from '../ProductCard';
import Products from '@/app/data/products.json';

const RelatedProducts = ({ title = 'Realted Products' }) => {
  return (
    <section className="relative py-10 lg:px-12 md:px-4 px-4 container mx-auto mt-12">
      <div className="mb-10">
        <MainHeading title={title} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
        {Products.slice(0, 4).map((product) => (
          <ProductCard
            key={product.id}
            imgUrl={product.productImage}
            id={product.id}
            productName={product.productName}
            price={product.price}
          />
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;
