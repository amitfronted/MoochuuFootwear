import Image from 'next/image';
import React from 'react';

export const HeroSectionTwo = () => {
  return (
    <section className="relative">
      <Image
        src="/firstbanner.png"
        alt="firt banner"
        width={1672}
        height={941}
      />
    </section>
  );
};
