'use client';

import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { useRef } from 'react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// import required modules
import { Navigation, Pagination, Autoplay, Keyboard } from 'swiper/modules';
import { IoIosArrowRoundBack, IoIosArrowRoundForward } from 'react-icons/io';

const Slider = () => {
  const swiperRef = useRef(null);

  return (
    <section className="relative w-full">
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        pagination={{ clickable: true }}
        keyboard={{ enabled: true }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        loop={true}
        modules={[Navigation, Pagination, Keyboard, Autoplay]}
        className="homeSwiper"
      >
        <SwiperSlide>
          <Image
            src="/banner/slider1.png"
            alt="slider 1"
            width={1920}
            height={1020}
            sizes="100vw"
            className="w-full h-auto"
            loading="eager"
          />
          <div className="absolute md:top-52 top-6 left-0 md:px-12 px-4 w-2/4 text-white">
            <h2 className="md:text-[200px] text-2xl sm:text-4xl font-extrabold md:leading-45 leading-10 md:scale-y-150 md:min-h-110 uppercase">
              Sun Mode
            </h2>
            <p className="uppercase text-sm md:text-[16px]">Bright Day.</p>
            <p className="uppercase text-sm md:text-[16px]">Good Friends.</p>
            <p className="uppercase text-sm md:text-[16px]">Right Energy.</p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <Image
            src="/banner/slider2.png"
            alt="slider 2"
            width={1920}
            height={1020}
            sizes="100vw"
            className="w-full h-auto"
            loading="eager"
          />
          <div className="absolute md:top-52 top-6 left-0 md:px-12 px-4 w-2/4 text-white">
            <h2 className="md:text-[200px] text-2xl sm:text-4xl font-extrabold md:scale-y-150 md:min-h-75 uppercase">
              Main
            </h2>
            <h2 className="md:text-[150px] text-2xl sm:text-4xl font-extrabold md:leading-36 md:scale-y-150 md:min-h-45 uppercase">
              Character
            </h2>
            <p className="uppercase text-sm md:text-[16px]">Your Story.</p>
            <p className="uppercase text-sm md:text-[16px]">Your Mood.</p>
            <p className="uppercase text-sm md:text-[16px]">Your Way.</p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <Image
            src="/banner/slider3.png"
            alt="slider 3"
            width={1920}
            height={1020}
            sizes="100vw"
            className="w-full h-auto"
            loading="eager"
          />
          <div className="absolute md:top-72 top-6 left-0 md:px-12 px-4 w-2/4 text-white">
            <h2 className="md:text-[120px] text-2xl sm:text-4xl font-extrabold md:leading-28 leading-10 md:scale-y-150 md:min-h-65 uppercase text-yellow">
              Outside Energy
            </h2>
            <p className="uppercase text-sm md:text-[16px]">Fresh Air.</p>
            <p className="uppercase text-sm md:text-[16px]">Good People.</p>
            <p className="uppercase text-sm md:text-[16px]">No Rules.</p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <Image
            src="/banner/slider4.png"
            alt="slider 4"
            width={1920}
            height={1020}
            sizes="100vw"
            className="w-full h-auto"
            loading="eager"
          />
          <div className="absolute md:top-52 top-6 left-0 md:px-12 px-4 w-2/4 text-white">
            <h2 className="md:text-[200px] text-2xl sm:text-4xl font-extrabold md:leading-45 leading-10 md:scale-y-150 md:min-h-110 uppercase text-[#d22626]">
              After hours
            </h2>
            <p className="uppercase text-sm md:text-[16px] text-black">
              Night hit different.
            </p>
            <p className="uppercase text-sm md:text-[16px] text-black">
              Same Energy.
            </p>
            <p className="uppercase text-sm md:text-[16px] text-black">
              New Stories.
            </p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <Image
            src="/banner/slider5.png"
            alt="slider 5"
            width={1920}
            height={1020}
            sizes="100vw"
            className="w-full h-auto"
            loading="eager"
          />
          <div className="absolute md:top-52 top-6 left-0 md:px-12 px-4 w-2/4 text-white">
            <h2 className="md:text-[200px] text-2xl sm:text-4xl font-extrabold md:leading-45 leading-10 md:scale-y-150 md:min-h-110 uppercase text-[#f5b3bf]">
              Soft Chaos
            </h2>
            <p className="uppercase text-sm md:text-[16px]">Moods Change.</p>
            <p className="uppercase text-sm md:text-[16px]">Vibe don't.</p>
            <p className="uppercase text-sm md:text-[16px]">We mix anyway.</p>
          </div>
        </SwiperSlide>
      </Swiper>

      {/* Custom Buttons */}
      <div className="absolute md:w-50 w-24 md:bottom-6 bottom-3 md:right-8 right-2 z-1 flex md:gap-8 gap-2">
        <button
          className="bg-yellow text-black md:w-12 md:h-12 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
          onClick={() => swiperRef.current?.slidePrev()}
        >
          <IoIosArrowRoundBack className="md:w-8 md:h-8 w-6 h-6" />
        </button>

        <button
          className="bg-yellow text-black md:w-12 md:h-12 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
          onClick={() => swiperRef.current?.slideNext()}
        >
          <IoIosArrowRoundForward className="md:w-8 md:h-8 w-6 h-6" />
        </button>
      </div>
    </section>
  );
};

export default Slider;
