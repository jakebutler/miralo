import "./globals.css";
import type { Metadata } from "next";
import ReduxProvider from "../redux/provider";

export const metadata: Metadata = {
  title: "Miralo | From Interview Feedback to Demo-Ready UI Iterations",
  description:
    "Miralo turns validated interview feedback into UI-only iterations with before/after proof, decision logs, and deterministic demo artifacts.",
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
