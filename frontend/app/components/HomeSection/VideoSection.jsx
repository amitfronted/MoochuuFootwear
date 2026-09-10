import React from 'react';

const VideoSection = () => {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center text-center text-white ">
      <div className="video-docker absolute top-0 left-0 w-full h-full overflow-hidden">
        <video
          className="min-w-full min-h-full absolute object-cover"
          src="/video-moochuu.mp4"
          type="video/mp4"
          autoPlay
          muted
          loop
        ></video>
      </div>
      <div className="video-content space-y-2 z-10">
        <h1 className="font-bold text-4xl md:text-6xl lg:text-9xl text-white uppercase">
          First customized Footwear
        </h1>
        <h3 className="font-light text-lg md:text-3xl lg:text-5xl text-white">
          Moochuu India
        </h3>
      </div>
    </section>
  );
};

export default VideoSection;
