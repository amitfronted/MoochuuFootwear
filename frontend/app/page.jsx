import { Boaring } from './components/HomeSection/Boaring';
import BuildYourPair from './components/HomeSection/BuildYourPair';
import FourBoxSection from './components/HomeSection/FourBoxSection';
import HeroSection from './components/HomeSection/HeroSection';
import MidSection from './components/HomeSection/MidSection';
import Slider from './components/HomeSection/Slider';
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
      <HeroSection />
      <FourBoxSection
        title="For Women & Little Ones"
        subtitle="Explore beautiful styles for women and children."
        categories={['women', 'child']}
      />
      <Boaring />
      <FourBoxSection
        title="Men's & Unisex Styles"
        subtitle="Discover everyday comfort and timeless designs."
        categories={['men', 'unisex']}
      />
      <Slider />
      <MidSection />
      {/* <FourBoxSection
        title="Men's & Unisex Styles"
        subtitle="Discover everyday comfort and timeless designs."
        categories={['men', 'child']}
      /> */}
      <BuildYourPair />
    </>
  );
}
