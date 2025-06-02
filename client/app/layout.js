import { ClerkProvider } from "@clerk/nextjs";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-sans-serif",
  subsets: ["latin"],
});

export const metadata = {
  title: "Homebase",
  description:
    "The only place you need to go to for creating high quality study guides and problem sets for all of your hard classes.",
  icons: {
    icon: "/brand/homefile.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${rubik.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
