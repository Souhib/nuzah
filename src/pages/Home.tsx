import { Hero } from "@/components/sections/Hero";
import { Experience } from "@/components/sections/Experience";
import { Gallery } from "@/components/sections/Gallery";
import { Pricing } from "@/components/sections/Pricing";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Trust } from "@/components/sections/Trust";
import { Location } from "@/components/sections/Location";
import { Contact } from "@/components/sections/Contact";
import { FAQ } from "@/components/sections/FAQ";

interface HomeProps {
  isNight: boolean;
}

export function Home({ isNight }: HomeProps) {
  return (
    <main>
      <Hero isNight={isNight} />
      <Experience isNight={isNight} />
      <Gallery isNight={isNight} />
      <Pricing isNight={isNight} />
      <HowItWorks isNight={isNight} />
      <Trust isNight={isNight} />
      <Location isNight={isNight} />
      <Contact isNight={isNight} />
      <FAQ isNight={isNight} />
    </main>
  );
}
