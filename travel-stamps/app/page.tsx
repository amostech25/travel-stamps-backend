import { DemoBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import Explorer from "@/components/Explorer";
import { DEMO_MODE } from "@/lib/config";
import { getApprovedStamps } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const stamps = await getApprovedStamps();
  return (
    <>
      <SiteHeader active="explore" />
      {DEMO_MODE && <DemoBanner />}
      <section className="hero">
        <h1>
          Where the world<br />
          <span>welcomes you.</span>
        </h1>
        <p>
          A travel guide built by travellers from every background. The places that made us feel at home, the ones
          worth ticking off, and the ones to think twice about.
        </p>
      </section>
      <Explorer stamps={stamps} />
      <SiteFooter />
    </>
  );
}

