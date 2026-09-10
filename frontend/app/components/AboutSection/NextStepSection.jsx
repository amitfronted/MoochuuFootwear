import Image from 'next/image';
import React from 'react';

const NextStepSection = () => {
  return (
    <section
      className="relative bg-no-repeat bg-cover md:bg-center bg-[#e9dcc9] py-6"
      style={{ backgroundImage: "url('/about/bg-our.png')" }}
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-12 gap-4">
          <div className="lg:col-span-6 md:col-span-12 flex gap-12 items-center">
            <h4 className="flex flex-col text-black font-extrabold uppercase text-3xl">
              <span className="font-medium text-lg tracking-widest">
                Powered by
              </span>{' '}
              NextStep <br />
              Lifestyle
            </h4>
            <p className="text-lg leading-6 font-medium mt-7">
              Nextstep Lifestyle is a creative lifestyle company building
              expressive everyday brands that celebrate culture, comfort and
              individuality
            </p>
          </div>
          <div className="lg:col-span-6 md:col-span-12 flex items-center justify-end">
            <h2 className="lg:text-4xl md:text-2xl font-extrabold font-rocksalt lg:leading-14 md:leading-8 -rotate-6 text-[#10522e]">
              Good Moods <br />
              Travel fast.
              <Image
                src="/pinkndeline1.png"
                alt="pink undeline"
                width={250}
                height={20}
              />
            </h2>
            <Image
              src="/icon/pink-tree.png"
              alt="pink tree"
              width={100}
              height={150}
              className="relative -top-4"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default NextStepSection;
