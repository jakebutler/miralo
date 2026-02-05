import "./globals.css";
import type { Metadata } from "next";
import ReduxProvider from "../redux/provider";

export const metadata: Metadata = {
  title: "Demo Todo App",
  description: "Miralo interview target todo app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
