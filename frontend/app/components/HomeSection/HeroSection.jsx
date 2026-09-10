import Image from 'next/image';
import React from 'react';
import { CiFaceSmile } from 'react-icons/ci';
import { MdArrowOutward } from 'react-icons/md';

const HeroSection = () => {
  return (
    <section
      className="relative bg-no-repeat bg-cover md:bg-center bg-position-[70%_50%] py-8"
      style={{ backgroundImage: "url('/banner/banner1.png')" }}
    >
      <div className="relative">
        <div className="container mx-auto lg:px-12 md:px-4 px-4 w-full">
          <h2 className="lg:text-9xl md:text-6xl text-6xl font-extrabold uppercase w-1/4 lg:mt-42 md:mt-28 lg:leading-28 md:leading-14 leading-14 tracking-tight">
            M00ds Change. you don't.
          </h2>
          <p className="flex flex-col font-semibold leading-6 pt-4 pb-5 text-lg">
            <span>One slipper.</span> <span>Endless combinations</span>
          </p>
          <button className="uppercase tracking-tight bg-yellow px-6 py-2 font-bold text-black rounded-full flex items-center justify-center hover:text-white hover:bg-black transition-colors duration-700 cursor-pointer">
            Build your Pair
            <MdArrowOutward className="ml-3" />
          </button>
          <p className="uppercase mt-16 flex items-center justify-start">
            <CiFaceSmile className="mr-2 w-10 h-10" />
            <label className="flex flex-col font-semibold text-sm">
              <span className="inline-flex">designed to express.</span>{' '}
              <span className="inline-flex">Made to be yours.</span>
            </label>
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
