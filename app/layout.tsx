import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Utah Offender Verification Engine",
  description: "Journalism data collection tool — Utah DOC offender checks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              Utah Offender Verification Engine
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Journalism tool — Utah DOC automated checks
            </p>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
