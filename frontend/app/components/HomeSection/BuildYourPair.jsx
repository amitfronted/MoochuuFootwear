import Link from 'next/link';
import { IoIosArrowRoundForward } from 'react-icons/io';

const BuildYourPair = () => {
  return (
    <section
      className="relative md:py-16 py-10 md:px-12 px-4 bg-no-repeat bg-cover md:bg-center bg-position-[90%_50%] min-h-[400px]"
      style={{ backgroundImage: "url('/footer-top.png')" }}
    >
      <div className="container mx-auto flex justify-start items-center">
        <div className="md:w-1/3 w-full md:pt-32 pt-6">
          <h2 className="md:text-9xl text-3xl sm:text-5xl uppercase font-extrabold text-black">
            Build Your Pair
          </h2>
          <p className="uppercase font-medium pt-2.5">
            Made to mix. Made for you.
          </p>
          <Link
            href={'/shop'}
            className="inline-flex border border-black mt-5 py-3 px-5 items-center justify-center font-bold uppercase mb-20 hover:bg-black hover:text-white transition-colors duration-700 cursor-pointer"
          >
            Customize Now <IoIosArrowRoundForward className="ml-6 w-8 h-8" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BuildYourPair;
