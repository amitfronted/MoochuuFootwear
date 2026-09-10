import Image from 'next/image';
import React from 'react';

const OurStory = () => {
  return (
    <section
      className="relative bg-repeat lg:bg-contain pt-4 pb-16"
      style={{ backgroundImage: "url('/about/bg-our.png')" }}
    >
      <div className="container mx-auto px-4 grid grid-cols-12 gap-6 md:items-center">
        <div className="md:col-span-6 lg:col-span-4 col-span-12">
          <div className="flex items-end justify-start mb-6">
            <Image
              src="/about/green-tree.png"
              width={92}
              height={99}
              alt="green tree"
            />
            <span className="lg:text-5xl md:text-4xl text-2xl text-[#10522e] font-extrabold uppercase tracking-tight md:scale-y-150">
              Our Story
            </span>
          </div>
          <div className="pl-3 lg:pr-16 md:pr-8 pr-0">
            <p className="mb-6 text-black lg:text-lg md:text-md">
              Moochuu was born in Thailand. A Place where life move slow, the
              colors are loud and comfort is a way of living.
            </p>
            <p className="text-black lg:text-lg md:text-md">
              Inspired by Thai beach towns, night markets, street culture and
              joy of everyday escapes, we created a slipper that brings vacation
              energy to your daily life.
            </p>
            <h4 className="uppercase text-[#b25661] mt-5 font-extrabold text-lg">
              Thailand gave us the mood. We gave it name.
            </h4>
          </div>
        </div>
        <div className="lg:col-span-8 md:col-span-6 col-span-12">
          <div className="relative w-full h-40 md:h-70 lg:h-120">
            <Image
              src={'/about/ourstory.png'}
              alt="our story"
              fill
              className="w-auto h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurStory;
