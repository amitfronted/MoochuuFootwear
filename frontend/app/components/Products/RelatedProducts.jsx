import React from 'react';
import FourBoxSection from '../HomeSection/FourBoxSection';

const RelatedProducts = ({ productId, category }) => {
  if (!category) {
    return null;
  }
  return (
    <section className="relative py-10 lg:px-12 md:px-4 px-4 container mx-auto mt-12">
      <FourBoxSection
        title="Related Products"
        subtitle="You may also like these products"
        categories={[category]}
        excludeProductId={productId}
      />
    </section>
  );
};

export default RelatedProducts;
