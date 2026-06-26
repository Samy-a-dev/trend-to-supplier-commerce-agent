import "./globals.css";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trend-to-Supplier Commerce Agent",
  description: "Live local dashboard for sourcing opportunities from real market signals."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark">TS</span>
              <span>
                <h1>Trend-to-Supplier Commerce Agent</h1>
                <p>Local ADK pipeline with live evidence, scoring, suppliers, and RFQs</p>
              </span>
            </Link>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
