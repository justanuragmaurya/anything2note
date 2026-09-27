import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import MarketingNotFound from "./(marketing)/not-found";

/** Catch-all 404 for URLs that match no route at all. */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main>
        <MarketingNotFound />
      </main>
      <Footer />
    </>
  );
}
