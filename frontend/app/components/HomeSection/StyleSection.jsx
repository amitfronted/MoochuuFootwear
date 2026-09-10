import Image from 'next/image';
import React from 'react';
import { CiFaceSmile } from 'react-icons/ci';

const StyleSection = () => {
  return (
    <section className="relative bg-[#f8f6f5] py-8">
      <div className="flex justify-between items-center md:px-12 px-4 pb-5 relative">
        <h2 className="md:text-lg text-sm uppercase font-bold flex flex-col items-start justify-center">
          Moochuu
          <hr className="w-12.5 border-2 border-black mt-2" />
        </h2>
        <h3 className="flex">
          <label className="flex-col flex items-end justify-center font-bold text-sm md:mr-16 mr-8 leading-4">
            <span>Real People</span>
            <span>Real Mood</span>
            <hr className="w-12.5 border-2 border-black mt-2" />
          </label>
          <CiFaceSmile className="bg-yellow rounded-full md:w-10 md:h-10 w-6 h-6 ml-2 absolute top-2 md:right-12 right-4" />
        </h3>
      </div>
      <div className="flex w-full lg:flex-row md:flex-col flex-col-reverse">
        <div className="relative lg:pt-40 md:pt-10 pt-4 lg:w-1/4 md:w-full w-full md:pl-12 pl-4">
          <h2 className="md:text-7xl text-6xl font-extrabold uppercase md:leading-16 leading-12 tracking-tight lg:min-h-75 md:min-h-40 min-h-40 lg:scale-y-150 md:scale-y-120">
            Styled <br className="md:hidden" />
            Different. <br />
            Worn <br className="md:hidden" />
            Personal.
          </h2>
          <div className="w-full md:pl-12 pl-0 pt-2.5 ">
            <Image
              src="/underline.png"
              alt="underline"
              width={255}
              height={18}
            />
          </div>
          <p className="flex flex-col mt-5 leading-5 font-bold text-black">
            <span>Same slipper.</span>
            <span>Different energy.</span>
          </p>
          <div className="pt-6 pb-4 md:flex justify-end items-center hidden md:absolute md:top-[60%] md:right-0 lg:relative lg:top-auto lg:right-0">
            <Image src="/express.png" alt="express" width={179} height={115} />
          </div>
          <div className="md:flex hidden">
            <Image src="/logo.png" alt="logo" width={40} height={40} />
          </div>
        </div>
        <div className="lg:w-3/4 md:w-full w-full relative min-h-75 md:min-h-100 lg:min-h-0">
          <Image src="/3.png" alt="section 3" fill className="w-full h-auto" />
        </div>
      </div>
    </section>
  );
};

export default StyleSection;
