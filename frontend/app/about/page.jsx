import OurStory from '../components/AboutSection/OurStory';
import AboutBanner from '../components/AboutSection/AboutBanner';
import CultureSection from '../components/AboutSection/CultureSection';
import NextStepSection from '../components/AboutSection/NextStepSection';
import MakesDiffrentNew from '../components/AboutSection/MakesDiffrentNew';

const page = () => {
  return (
    <>
      <AboutBanner />
      <OurStory />
      <MakesDiffrentNew />
      <CultureSection />
      <NextStepSection />
    </>
  );
};

export default page;
