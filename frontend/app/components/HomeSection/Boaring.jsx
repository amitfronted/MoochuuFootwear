import Image from 'next/image';

export const Boaring = () => {
  return (
    <section
      className="relative py-12 bg-no-repeat bg-cover md:bg-center bg-position-[80%_50%]"
      style={{ backgroundImage: "url('/boaring.png')" }}
    >
      <p className="uppercase rotate-270 absolute md:left-0 -left-10 md:bottom-22 bottom-24 font-semibold">
        Mix your vibe
      </p>
      <div className="relative">
        <div className="container mx-auto md:px-32 px-12">
          <div className="w-full md:pt-40 pt-0">
            <h2 className="md:text-8xl text-4xl font-extrabold uppercase md:leading-20 leading-11 tracking-tight md:scale-y-150 md:min-h-75 md:bg-transparent md:p-0 p-2 bg-white/30">
              Build for <br />
              people who <br />
              hate boaring.
            </h2>
            <p className="font-rocksalt uppercase font-semibold pt-6">
              This Is Moochuu.
            </p>
            <div className="w-50 flex justify-end pt-2">
              <Image
                src="/underline2.png"
                alt="underline"
                width={98}
                height={7}
              />
            </div>
            <ul className="flex flex-col leading-5 md:pt-6 text-black md:bg-transparent bg-white/60 md:mt-0 mt-4 md:p-0 p-2">
              <li>Colors outside the lines.</li>
              <li>Wear what feels like you.</li>
              <li>Nothing about Moochuu</li>
              <li>was made to blend in.</li>
              <li>Make it yours. Wear it your way.</li>
              <li>Your mood. Your colors. Your pair</li>
            </ul>
            <hr className="w-12 border border-black mt-8" />
            <h4 className="font-semibold text-lg uppercase pt-3">
              Express. Mix. Match. Repeat.
            </h4>
          </div>
        </div>
      </div>
    </section>
  );
};
