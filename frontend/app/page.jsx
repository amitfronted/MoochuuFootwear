import { Boaring } from './components/HomeSection/Boaring';
import { BoaringNew } from './components/HomeSection/BoaringNew';
import BuildYourPairNew from './components/HomeSection/BuildYourPairNew';
import FourBoxSection from './components/HomeSection/FourBoxSection';
import { HeroSectionTwo } from './components/HomeSection/HeroSectionTwo';
import MidSection from './components/HomeSection/MidSection';
import Slider from './components/HomeSection/Slider';
import { ThreeSection } from './components/HomeSection/ThreeSection';
import VideoSection from './components/HomeSection/VideoSection';

export default function Home() {
  return (
    <>
      <VideoSection />
      <FourBoxSection
        title="Unisex Collection"
        subtitle="Versatile styles designed for everyone."
        categories={['unisex']}
      />
      <HeroSectionTwo />
      <FourBoxSection
        title="Only For Women"
        subtitle="Explore beautiful styles for women."
        categories={['women']}
      />
      <BoaringNew />
      <FourBoxSection
        title="Men's & Unisex Styles"
        subtitle="Discover everyday comfort and timeless designs."
        categories={['men', 'unisex']}
      />
      <Slider />
      <MidSection />
      <ThreeSection />
      <BuildYourPairNew />
    </>
  );
}
