import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

export const ThreeSection = () => {
  return (
    <section className="relative my-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative w-full">
            <Link
              href={'/shop'}
              className="group block relative w-full overflow-hidden"
            >
              <Image
                src="/three-1.png"
                alt="build pair"
                width={1200}
                height={900}
                className="w-full h-auto grayscale-50 group-hover:grayscale-0 transition-all duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </Link>
          </div>
          <div className="relative w-full">
            <Link
              href={'/shop'}
              className="group block relative w-full overflow-hidden"
            >
              <Image
                src="/three-2.png"
                alt="build pair"
                width={1200}
                height={900}
                className="w-full h-auto grayscale-50 group-hover:grayscale-0 transition-all duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </Link>
          </div>
          <div className="relative w-full">
            <Link
              href={'/shop'}
              className="group block relative w-full overflow-hidden"
            >
              <Image
                src="/three-3.png"
                alt="build pair"
                width={1200}
                height={900}
                className="w-full h-auto grayscale-50 group-hover:grayscale-0 transition-all duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
