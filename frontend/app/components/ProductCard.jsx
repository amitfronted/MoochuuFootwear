import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const ProductCard = ({ imgUrl, id, productName, price }) => {
  return (
    <div className="block">
      <Link href={`/shop/${id}`}>
        <div className="w-full border-0 rounded-sm flex flex-col">
          <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-110 bg-gray-100 overflow-hidden rounded-2xl">
            <Image
              src={`${imgUrl}`}
              alt={productName}
              fill
              sizes="50vw"
              className="object-cover absolute"
              loading="eager"
            />
          </div>
          <div className="py-3 sm:py-5 px-1 sm:px-2 flex justify-between items-center">
            <h4 className="text-[14px] sm:text-[16px] text-black font-medium line-clamp-1">
              {productName}
            </h4>
            <p className="text-[14px] sm:text-[16px] text-gray-900 ml-2 whitespace-nowrap">
              <span className="mr-1">₹</span> {price}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
