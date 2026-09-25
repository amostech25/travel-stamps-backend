import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Notice" };

// Fill these in before launch.
const OWNER = "[YOUR NAME OR BUSINESS NAME]";
const LAST_UPDATED = "[DATE]";

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <>
      <SiteHeader />
      <main className="prose">
        <h1>Privacy Notice</h1>
        <p>Last updated: {LAST_UPDATED}</p>
        <p>
          Travel Stamps collects as little about you as possible. You don’t need an account to browse or submit a stamp,
          and we never ask for your email address to submit.
        </p>

        <h2>Who we are</h2>
        <p>
          Travel Stamps (travelstampsguide.com) is run by {OWNER}, based in the United Kingdom. We are the data controller
          for the information described here. Contact: {mail}.
        </p>

        <h2>What we collect and why</h2>
        <table>
          <thead><tr><th>What</th><th>Why we use it</th><th>Lawful basis</th></tr></thead>
          <tbody>
            <tr><td>Your stamp: country, city, place name, tags, verdict, note and map link</td><td>To review it and, if approved, show it on the public map</td><td>Legitimate interests (running a community guide)</td></tr>
            <tr><td>Contributor name or handle, if you give one</td><td>To credit you publicly on your stamp</td><td>Legitimate interests; it’s optional and you choose what to enter</td></tr>
            <tr><td>IP address and basic device information at the time you submit</td><td>To block spam and limit repeat submissions</td><td>Legitimate interests (keeping the site safe)</td></tr>
            <tr><td>Standard server and map logs when you browse</td><td>To deliver pages and map tiles and keep the site working</td><td>Legitimate interests</td></tr>
          </tbody>
        </table>
        <p>We don’t use advertising or tracking cookies, and we don’t sell or share your information for marketing.</p>

        <h2>Sensitive information</h2>
        <p>
          Notes about how you were treated can reveal things like your ethnicity or religion. Only include what you’re
          comfortable being public. We may remove details that identify you or anyone else before publishing.
        </p>

        <h2>Who we share it with</h2>
        <p>We use a small number of providers to run the site. They process data only on our instructions.</p>
        <table>
          <thead><tr><th>Provider</th><th>What they do</th></tr></thead>
          <tbody>
            <tr><td>Supabase</td><td>Stores submissions and the admin login</td></tr>
            <tr><td>Vercel</td><td>Hosts the website</td></tr>
            <tr><td>MapTiler</td><td>Supplies the map, which involves receiving your IP address</td></tr>
            <tr><td>Cloudflare Turnstile</td><td>Checks submissions aren’t from bots</td></tr>
          </tbody>
        </table>
        <p>
          Some providers may process data outside the UK. Where they do, we rely on safeguards recognised under UK law, such
          as the UK International Data Transfer Addendum or an adequacy decision.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li><strong>Approved stamps:</strong> while they’re on the map. Removed stamps are deleted straight away.</li>
          <li><strong>Rejected stamps:</strong> deleted within 30 days of the decision.</li>
          <li><strong>Spam-prevention data:</strong> we store a scrambled (hashed) version of your IP address, never the address itself, and delete it within 7 days.</li>
          <li><strong>Provider logs:</strong> kept for the provider’s standard period.</li>
        </ul>

        <h2>Your rights</h2>
        <p>
          Under UK data protection law you can ask to see, correct or delete information about you, or object to how we use
          it. Because we don’t collect contact details, tell us which stamp is yours (the place, city and roughly when you
          submitted it) so we can find it. Email {mail} and we’ll reply within one month.
        </p>
        <p>
          If you’re unhappy with how we’ve handled your information, you can complain to the Information Commissioner’s
          Office at <a href="https://ico.org.uk" rel="noopener noreferrer">ico.org.uk</a>.
        </p>

        <h2>Changes</h2>
        <p>We’ll update this notice if how we use information changes, and show the date of the latest version at the top.</p>
      </main>
      <SiteFooter />
    </>
  );
}
