import { Architecture } from '@/components/marketing/Architecture';
import { Compliance } from '@/components/marketing/Compliance';
import { Faq } from '@/components/marketing/Faq';
import { FinalCta } from '@/components/marketing/FinalCta';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { InteractiveDemo } from '@/components/marketing/InteractiveDemo';
import { Pricing } from '@/components/marketing/Pricing';
import { Problem } from '@/components/marketing/Problem';
import { Solution } from '@/components/marketing/Solution';

// Section order is 01 §6's, unchanged. The social-proof slot between Pricing
// and FAQ is deliberately unrendered until real testimonials exist.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <InteractiveDemo />
      <HowItWorks />
      <Architecture />
      <Compliance />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
