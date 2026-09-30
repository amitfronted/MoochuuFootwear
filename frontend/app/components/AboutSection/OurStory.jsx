import Image from 'next/image';
import React from 'react';

const OurStory = () => {
  return (
    <section
      className="relative lg:bg-cover lg:bg-position-[100%_100%] md:bg-position-[60%_70%] bg-position-[65%_70%]"
      style={{ backgroundImage: "url('/about/ourstory-new.png')" }}
    >
      <div className="container mx-auto md:px-12 px-4 lg:py-60 py-20 md:bg-transparent bg-black/50 grid grid-cols-12 gap-6 md:items-center">
        <div className="md:col-span-8 lg:col-span-5 col-span-12">
          <h2 className="flex items-end justify-start mb-8 lg:text-9xl md:text-5xl text-5xl text-white font-extrabold uppercase font-anton">
            Our <span className="text-[#fff200] ml-4">Story</span>
          </h2>

          <div className="pl-3 lg:pr-16 md:pr-8 pr-0 font-inter">
            <p className="mb-6 text-white lg:text-lg md:text-md md:pr-16 pr-0">
              Moochuu was born in Thailand. A Place where life move slow, the
              colors are loud and comfort is a way of living.
            </p>
            <p className="text-white lg:text-lg md:text-md md:pr-16 pr-0">
              Inspired by Thai beach towns, night markets, street culture and
              joy of everyday escapes, we created a slipper that brings vacation
              energy to your daily life.
            </p>
            <h4 className="uppercase text-[#fff200] mt-5 font-extrabold font-anton text-2xl">
              Thailand gave us the mood. We gave it name.
            </h4>
          </div>
        </div>
        {/* <div className="lg:col-span-8 md:col-span-6 col-span-12">
          <div className="relative w-full h-40 md:h-70 lg:h-120">
            <Image
              src={'/about/ourstory.png'}
              alt="our story"
              fill
              className="w-auto h-auto"
            />
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default OurStory;
