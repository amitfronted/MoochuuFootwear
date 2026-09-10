import OurStory from '../components/AboutSection/OurStory';
import MakesDiffrent from '../components/AboutSection/MakesDiffrent';
import AboutBanner from '../components/AboutSection/AboutBanner';
import CultureSection from '../components/AboutSection/CultureSection';
import NextStepSection from '../components/AboutSection/NextStepSection';

const page = () => {
  return (
    <>
      <AboutBanner />
      <OurStory />
      <MakesDiffrent />
      <CultureSection />
      <NextStepSection />
    </>
  );
};

export default page;
