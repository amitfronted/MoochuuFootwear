import Image from 'next/image';
import Link from 'next/link';
import { IoIosArrowRoundForward } from 'react-icons/io';

const BuildYourPairNew = () => {
  return (
    <section className="relative">
      <Image src="/home-last.png" alt="footer top" width={1920} height={1080} />
      <div className="absolute w-full bottom-3 sm:top-30 md:top-52 lg:top-96 xl:pr-52 lg:pr-32 md:pr-20 top-14 z-9">
        <div className="container mx-auto flex justify-center items-center lg:px-12 md:px-12 px-4">
          <Link
            href={'/shop'}
            className="inline-flex border border-black mt-5 md:py-3 py-0.5 md:px-5 px-2 text-[11px] md:text-[16px] items-center justify-center font-bold uppercase bg-black hover:bg-transparent hover:text-black text-white transition-colors duration-700 cursor-pointer"
          >
            Customize Now{' '}
            <IoIosArrowRoundForward className="md:ml-6 ml-2 md:w-8 md:h-8 w-6 h-6" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BuildYourPairNew;
