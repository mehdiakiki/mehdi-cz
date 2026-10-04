import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SectionContainer from "@/components/SectionContainer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionContainer>
      <Header />
      <main className="mb-auto">{children}</main>
      <Footer />
    </SectionContainer>
  );
}
