import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function Guidelines() {
  return (
    <>
      <SiteHeader active="how" />
      <main className="prose">
        <h1>Community Guidelines</h1>
        <p>
          Travel Stamps is a guide built by travellers from every background, for each other. Every stamp is read by a
          person before it appears on the map. These guidelines explain what we’re looking for and what we’ll turn down.
        </p>

        <h2>What makes a good stamp</h2>
        <ul>
          <li><strong>You’ve been there.</strong> Share places you’ve visited yourself, not places you’ve only heard about.</li>
          <li><strong>It helps someone decide.</strong> Say how you were treated, what stood out, and anything you wish you’d known before going.</li>
          <li><strong>It’s specific.</strong> Name the place, the city and the country, and add a map link that points to the exact spot.</li>
          <li><strong>The tags fit.</strong> Pick every tag that describes your experience, such as Welcoming, Halal food or Afro hair care. Only choose tags you can stand behind.</li>
          <li><strong>The verdict is honest.</strong> Must go, Worth it, It’s okay and Skip are all useful. A fair “Skip” can protect the next traveller.</li>
        </ul>

        <h2>Be respectful</h2>
        <ul>
          <li>Write about places and experiences, not individuals. Don’t name or describe staff, locals or other travellers in a way that could identify them.</li>
          <li>If you had a bad experience, including one involving racism or discrimination, you can describe what happened factually. Avoid insults, threats or claims you can’t back up.</li>
          <li>No hate speech, slurs or content that demeans anyone because of their race, ethnicity, religion, gender, sexuality, disability or nationality. That includes the people and places you’re writing about.</li>
        </ul>

        <h2>Your contributor name</h2>
        <p>
          You can add a name or handle so others know who shared a stamp, or leave it blank to post anonymously. Don’t use
          someone else’s name, and don’t put contact details such as phone numbers, emails or social links in the name or note.
        </p>

        <h2>What we won’t publish</h2>
        <ul>
          <li>Adverts, promotions or stamps written for a business you own or are paid by</li>
          <li>Content that is false, copied from elsewhere, or not about travel</li>
          <li>Personal information about anyone, including yourself</li>
          <li>Links other than a map link to the place</li>
          <li>Duplicates of a place that’s already on the map (we may merge them)</li>
          <li>Anything illegal, dangerous or sexually explicit</li>
        </ul>

        <h2>How moderation works</h2>
        <p>
          Every submission waits in a review queue until the admin approves or rejects it. Approved stamps appear on the map
          with the contributor name, if one was given. We may lightly edit a stamp to fix a map link or remove personal
          details, but we won’t change your verdict or the meaning of your note.
        </p>
        <p>
          Stamps already on the map can be removed if they become out of date, break these guidelines, or are reported. To
          report a stamp or ask for one of yours to be removed, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
