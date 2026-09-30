import Image from 'next/image';
import React from 'react';

const MakesDiffrentNew = () => {
  return (
    <section className="relative">
      <Image
        src="/about/moochuu-diffrent.png"
        width={1920}
        height={1080}
        alt="Makes Diffrent"
        loading="eager"
      />
    </section>
  );
};

export default MakesDiffrentNew;
