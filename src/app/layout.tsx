import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TKI Cash Control",
  description: "PT TKI cash monitoring and office expense planning",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
