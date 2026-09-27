import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
