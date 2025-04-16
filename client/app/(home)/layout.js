import Header from "/app/components/header/header";

export const metadata = {
  title: "Homebase",
  description: "The only place you need to go to for creating high quality study guides and problem sets for all of your hard classes.",
};

export default function RootLayout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
