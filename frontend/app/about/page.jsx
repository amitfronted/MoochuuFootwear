import OurStory from '../components/AboutSection/OurStory';
import AboutBanner from '../components/AboutSection/AboutBanner';
import CultureSection from '../components/AboutSection/CultureSection';
import NextStepSection from '../components/AboutSection/NextStepSection';
import MakesDiffrentNew from '../components/AboutSection/MakesDiffrentNew';
import Image from 'next/image';

const page = () => {
  return (
    <>
      <AboutBanner />
      <OurStory />
      <MakesDiffrentNew />
      <section className="relative">
        <Image
          src="/about/about-last.png"
          alt="Culture Section"
          width={1920}
          height={1080}
        />
      </section>
      {/* <CultureSection />
      <NextStepSection /> */}
    </>
  );
};

export default page;
