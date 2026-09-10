import Image from 'next/image';
import { MdArrowOutward } from 'react-icons/md';

const BuildPair = () => {
  return (
    <section className="relative flex flex-col-reverse md:flex-row gap-2 min-h-175 bg-[#faf8f6]">
      <div className="md:w-1/3 w-full md:pt-32 pt-6 md:pl-12 pl-4 pr-0 pb-10 md:pb-0">
        <h2 className="uppercase md:text-8xl text-5xl text-black font-extrabold md:min-h-60 tracking-tight md:leading-20 leading-11 md:scale-y-150 md:pb-0 pb-8">
          Build <br />
          Your pair
        </h2>
        <ul className="border-b border-gray-500 pb-6 mb-6 flex flex-col gap-y-5">
          <li className="flex items-center justify-start gap-4 text-lg font-bold">
            <span className="scale-y-150 scale-x-125">01</span>
            <span>
              <hr className="w-10 border border-black" />
            </span>
            <span className="flex flex-col items-start justify-center leading-6 uppercase text-lg">
              choose strap
              <span className="text-gray-400 font-normal text-sm capitalize">
                Pick your color.
              </span>
            </span>
          </li>
          <li className="flex items-center justify-start gap-4 text-lg font-bold">
            <span className="scale-y-150 scale-x-125">02</span>
            <span>
              <hr className="w-10 border border-black" />
            </span>
            <span className="flex flex-col items-start justify-center leading-6 uppercase text-lg">
              choose sole
              <span className="text-gray-400 font-normal text-sm capitalize">
                Pick your vibe.
              </span>
            </span>
          </li>
        </ul>
        <p className="flex flex-col font-semibold leading-5">
          <span>Mix colors. swap parts.</span>
          <span>Create combinations that actually feel like you.</span>
        </p>
        <button className="uppercase tracking-tight bg-yellow mt-8 px-6 py-2 font-bold text-black rounded-full flex items-center justify-center hover:text-white hover:bg-black transition-colors duration-700 cursor-pointer">
          Build your Pair
          <MdArrowOutward className="ml-3" />
        </button>
      </div>
      <div className="md:w-2/3 w-full relative min-h-75 md:min-h-0">
        <Image
          src="/build.png"
          alt="build pair"
          fill
          className="w-full h-auto"
        />
      </div>
    </section>
  );
};

export default BuildPair;
