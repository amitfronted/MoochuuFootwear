import { Boaring } from './components/HomeSection/Boaring';
import BuildPair from './components/HomeSection/BuildPair';
import BuildYourPair from './components/HomeSection/BuildYourPair';
import HeroSection from './components/HomeSection/HeroSection';
import Slider from './components/HomeSection/Slider';
import StyleSection from './components/HomeSection/StyleSection';
import VideoSection from './components/HomeSection/VideoSection';

export default function Home() {
  return (
    <>
      <VideoSection />
      <HeroSection />
      {/* <StyleSection />
      <BuildPair /> */}
      <Boaring />
      <Slider />
      <BuildYourPair />
    </>
  );
}
