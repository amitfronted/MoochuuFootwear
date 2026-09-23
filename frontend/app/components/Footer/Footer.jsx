import Logo from '../Header/Logo';
import { CiFaceSmile } from 'react-icons/ci';
import Link from 'next/link';
import DrawerBox from '../DrawerBox';

const Footer = () => {
  return (
    <>
      <footer
        className="relative py-8 md:px-12 px-2 border-t-2 border-black"
        style={{ backgroundImage: "url('/footer.png')" }}
      >
        <div className="container mx-auto flex flex-col md:flex-col lg:flex-row justify-center items-start md:justify-between md:items-center md:gap-0 gap-y-4">
          <div className="lg:w-1/4 md:w-1/4 w-full flex flex-col md:justify-center md:items-start items-center justify-center">
            <Logo />
            <p className="font-semibold pt-3">Build for your mood.</p>
            <CiFaceSmile className="pt-2 w-12 h-12" />
          </div>
          <div className="lg:w-1/2 md:w-3/4 w-full">
            <ul className="w-full flex justify-center items-center flex-wrap gap-4 sm:gap-2 md:text-lg text-sm font-semibold uppercase">
              <li className='relative after:content-[""] after:absolute after:w-0.5 after:h-6 after:bg-black after:top-0 after:right-0 after:hidden sm:after:block md:px-8 px-2'>
                <Link
                  href="/shop"
                  className="relative 
                inline-block   
                after:content-['']   
                after:absolute   
                after:left-1/2   
                after:-translate-x-1/2   
                after:-bottom-1   
                after:h-0.5   
                after:w-0   
                after:bg-black   
                after:transition-all   
                after:duration-500   
                hover:after:w-full"
                >
                  Shop
                </Link>
              </li>
              <li className='relative after:content-[""] after:absolute after:w-0.5 after:h-6 after:bg-black after:top-0 after:right-0 after:hidden sm:after:block md:px-8 px-2'>
                <Link
                  href={'/'}
                  className="relative 
                inline-block   
                after:content-['']   
                after:absolute   
                after:left-1/2   
                after:-translate-x-1/2   
                after:-bottom-1   
                after:h-0.5   
                after:w-0   
                after:bg-black   
                after:transition-all   
                after:duration-500   
                hover:after:w-full"
                >
                  Customize
                </Link>
              </li>
              <li className='relative after:content-[""] after:absolute after:w-0.5 after:h-6 after:bg-black after:top-0 after:right-0 after:hidden sm:after:block md:px-8 px-2'>
                <Link
                  href="/about"
                  className="relative 
                inline-block   
                after:content-['']   
                after:absolute   
                after:left-1/2   
                after:-translate-x-1/2   
                after:-bottom-1   
                after:h-0.5   
                after:w-0   
                after:bg-black   
                after:transition-all   
                after:duration-500   
                hover:after:w-full"
                >
                  About
                </Link>
              </li>
              <li className="relative md:px-8 px-2">
                <Link
                  href={'/'}
                  className="relative 
                inline-block   
                after:content-['']   
                after:absolute   
                after:left-1/2   
                after:-translate-x-1/2   
                after:-bottom-1   
                after:h-0.5   
                after:w-0   
                after:bg-black   
                after:transition-all   
                after:duration-500   
                hover:after:w-full"
                >
                  Instagram
                </Link>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/4 md:w-full w-full flex justify-center flex-col md:items-end items-center">
            <p className="font-semibold">&copy; Moochuu 2026</p>
            <p className="font-rocksalt text-[12px] pt-3 flex gap-3 items-center">
              Stay soft <span>: )</span>
            </p>
          </div>
        </div>
      </footer>
      <DrawerBox />
    </>
  );
};

export default Footer;
