import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { SplashScreen } from '@/components/splash/SplashScreen';

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SplashScreen />
      <AnnouncementBar
        id="dpdp-2026-07"
        message="India's DPDP Act rules are now in force."
        linkLabel="What it means for you"
        linkHref="/docs/dpdp"
      />
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </>
  );
}
