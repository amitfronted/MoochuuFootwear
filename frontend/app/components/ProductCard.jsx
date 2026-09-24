import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const ProductCard = ({ imgUrl, id, productName, price, hoverImage }) => {
  return (
    <div className="group block border border-gray-400 rounded-2xl overflow-hidden">
      <Link href={`/shop/${id}`}>
        <div className="w-full flex flex-col relative">
          {/* Product Image */}
          <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-110 bg-gray-100 overflow-hidden rounded-2xl">
            {/* Main Image */}
            <Image
              src={imgUrl}
              alt={productName}
              fill
              sizes="50vw"
              className="
                object-cover
                transition-all
                duration-700
                ease-[cubic-bezier(0.22,1,0.36,1)]
                group-hover:scale-[1.02]
                group-hover:opacity-0
              "
              loading="eager"
            />

            {/* Hover Gallery Image */}
            {hoverImage && (
              <Image
                src={hoverImage}
                alt={`${productName} preview`}
                fill
                sizes="50vw"
                className="
                  object-cover
                  opacity-0
                  scale-[1.06]
                  transition-all
                  duration-700
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  group-hover:opacity-100
                  group-hover:scale-100
                "
                loading="eager"
              />
            )}

            {/* Product Information */}
            <div
              className="
                absolute
                bottom-0
                left-0
                w-full

                bg-white/90
                backdrop-blur-md

                px-2
                py-3
                sm:py-5

                flex
                justify-between
                items-center

                rounded-b-2xl

                translate-y-full
                opacity-0

                group-hover:translate-y-0
                group-hover:opacity-100

                transition-all
                duration-700
                ease-[cubic-bezier(0.22,1,0.36,1)]
              "
            >
              <h4
                className="
                  text-[14px]
                  sm:text-[16px]
                  text-black
                  font-semibold
                  line-clamp-1
                "
              >
                {productName}
              </h4>

              <p
                className="
                  text-[14px]
                  sm:text-[16px]
                  text-gray-900
                  font-semibold
                  ml-2
                  whitespace-nowrap
                "
              >
                <span className="mr-1">₹</span>
                {price}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
