import Image from 'next/image';
import React from 'react';

const MakesDiffrent = () => {
  return (
    <section className="relative bg-[#f9c426] py-12 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-12 gap-3">
          <div className="md:col-span-12 lg:col-span-4 col-span-12">
            <h2 className="text-black font-extrabold text-6xl uppercase md:scale-y-125 mb-12 tracking-tight top-4 relative">
              What Makes Moochuu Different
            </h2>
            <Image src="/icon/line.png" width={270} height={50} alt="line" />
          </div>
          <div className="lg:col-span-8 md:col-span-12 col-span-12">
            <ul className="flex flex-col md:flex-row lg:flex-row  gap-2 pt-6">
              <li className="flex flex-col px-4 text-center lg:w-1/5 w-full md:border-l-2 border-t-2 md:border-t-0 border-[#e55461] py-4">
                <Image
                  src="/icon/tree.png"
                  alt="tree"
                  width={100}
                  height={100}
                  className="relative mx-auto"
                />
                <h3 className="uppercase text-black font-bold text-lg pb-4">
                  Made To Mix
                </h3>
                <p>
                  Colors that prop. Pairs that don't take life too seriously.
                </p>
              </li>
              <li className="flex flex-col px-4 text-center lg:w-1/5 w-full md:border-l-2 border-t-2 md:border-t-0 border-[#e55461] py-4">
                <Image
                  src="/icon/cloud.png"
                  alt="tree"
                  width={100}
                  height={100}
                  className="relative mx-auto"
                />
                <h3 className="uppercase text-black font-bold text-lg pb-4">
                  Soft All Day
                </h3>
                <p>Cushion you can feel. Comfort you can live in.</p>
              </li>
              <li className="flex flex-col px-4 text-center lg:w-1/5 w-full md:border-l-2 border-t-2 md:border-t-0 border-[#e55461] py-4">
                <Image
                  src="/icon/sun.png"
                  alt="tree"
                  width={100}
                  height={100}
                  className="relative mx-auto"
                />
                <h3 className="uppercase text-black font-bold text-lg pb-4">
                  Lightweight Energy
                </h3>
                <p>
                  Easy to Wear.
                  <br /> Easy to Pack.
                  <br />
                  Easy to love.
                </p>
              </li>
              <li className="flex flex-col px-4 text-center lg:w-1/5 w-full md:border-l-2 border-t-2 md:border-t-0 border-[#e55461] py-4">
                <Image
                  src="/icon/cap.png"
                  alt="tree"
                  width={100}
                  height={100}
                  className="relative mx-auto"
                />
                <h3 className="uppercase text-black font-bold text-lg pb-4">
                  Built for Vacation Mode
                </h3>
                <p>From beach walks to city blocks. We go everyWhere.</p>
              </li>
              <li className="flex flex-col px-4 text-center lg:w-1/5 w-full md:border-l-2 border-t-2 md:border-t-0 border-[#e55461] py-4">
                <Image
                  src="/icon/smile.png"
                  alt="tree"
                  width={100}
                  height={100}
                  className="relative mx-auto"
                />
                <h3 className="uppercase text-black font-bold text-lg pb-4">
                  Expressive not boaring
                </h3>
                <p>Because basics are great, but personality is better.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MakesDiffrent;
