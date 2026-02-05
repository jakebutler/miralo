import "./globals.css";
import type { Metadata } from "next";
import ReduxProvider from "../redux/provider";

export const metadata: Metadata = {
  title: "Miralo",
  description: "Miralo hackathon demo with a Next.js Todo app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
