import Image from 'next/image';
import React from 'react';

const CultureSection = () => {
  return (
    <section
      className="relative bg-no-repeat bg-cover md:bg-position-[100%_65%] bg-[#e9dcc9]"
      style={{ backgroundImage: "url('/about/bg-culture.png')" }}
    >
      <div className="container mx-auto px-6 flex gap-2 md:flex-col lg:flex-row">
        <div className="flex flex-col gap-3 lg:w-1/4 md:w-full pt-12 md:pb-8">
          <h3 className="uppercase text-4xl text-[#10522e] font-extrabold tracking-tight md:scale-y-125 relative pb-2">
            The Culture <br />
            That Inspires Us
          </h3>
          <p className="lg:pr-32 md:pr-10 text-black text-lg">
            Sunsets that hit diffrent. Nights that last longer. Friends that
            feel like family. Music in the air. Markets, scooters, beaches, and
            endless dtories. This is the energy we carry with us.
          </p>
          <h4 className="uppercase text-[#b25661] font-extrabold text-lg">
            This is Moochuu.
          </h4>
        </div>
        <div className="lg:w-3/4 md:w-full">
          <div className="relative lg:h-110 md:h-60">
            <Image
              src="/about/culture-img.png"
              alt="culture image"
              fill
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CultureSection;
