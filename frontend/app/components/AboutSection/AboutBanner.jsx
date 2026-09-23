import React from 'react';
import Image from 'next/image';

const AboutBanner = () => {
  return (
    <section className="relative">
      <div className="relative h-76 md:h-96 lg:h-176">
        <Image
          src={'/about/about-banner.jpg'}
          alt="about main banner"
          fill
          className="w-auto h-auto"
          loading="eager"
        />
      </div>
      <div className="container mx-auto">
        <Image
          src="/about/banner-text1.png"
          alt="banner text"
          width={1920}
          height={982}
          className="absolute top-1/4 md:top-0 left-0 z-10 w-full h-auto px-4 sm:px-0"
        />
      </div>
    </section>
  );
};

export default AboutBanner;
