import { notFound } from 'next/navigation';
import SingleProduct from '../../components/Products/SingleProduct';
import { fetchProductById } from '../../lib/api';

const ProductDetails = async ({ params }) => {
  const { id } = await params;

  // Validate MongoDB ObjectId basic format (24 hex characters)
  if (!id || id.length !== 24) {
    notFound();
  }

  let product = null;

  try {
    const response = await fetchProductById(id);
    if (response.success && response.data) {
      product = response.data;
    }
  } catch (error) {
    console.error('Failed to fetch product:', error);
  }

  if (!product) {
    notFound();
  }

  return (
    <section className="relative py-6 lg:py-10 px-4 lg:px-0">
      <SingleProduct product={product} />
    </section>
  );
};

export default ProductDetails;
