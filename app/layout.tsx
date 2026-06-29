import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getdealstash.com"),
  title: "Dealstash | Deal Memory for CRE Acquisition Teams",
  description: "Dealstash turns broker OMs into a searchable CRE deal pipeline with AI scoring, similar deal recall, and a permanent decision log for acquisition teams.",
  openGraph: {
    title: "Dealstash | Deal Memory for CRE Acquisition Teams",
    description: "AI-powered deal pipeline, OM parsing, buy-box scoring, and firm memory for CRE acquisition teams.",
    url: "https://getdealstash.com",
    siteName: "Dealstash",
    images: [{ url: "/hero.png", width: 1200, height: 630, alt: "Dealstash product preview" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dealstash | Deal Memory for CRE Acquisition Teams",
    description: "OM parsing, AI scoring, similar deal recall, and pipeline memory for CRE acquisition teams.",
    images: ["/hero.png"],
  },
  alternates: { canonical: "https://getdealstash.com" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dealstash",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://getdealstash.com",
  description: "Deal pipeline and firm memory software for CRE acquisition teams.",
  offers: {
    "@type": "Offer",
    price: "149",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${manrope.className}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
