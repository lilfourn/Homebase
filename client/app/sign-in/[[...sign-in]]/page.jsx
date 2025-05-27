import BackButton from "@/app/components/ui/backButton";
import { BackgroundGradientAnimation } from "@/app/components/ui/background-gradient-animation";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <>
      <div className="h-screen flex justify-center items-center">
        <Link href="/" className="absolute top-2 left-2">
          <BackButton />
        </Link>
        <SignIn signInForceRedirectUrl="/dashboard" />
        <img
          src="/brand/homebase.png"
          alt="Homebase Logo"
          className="w-32 absolute top-2 right-2 transition-all ease-in-out duration-300 hover:scale-105 cursor-pointer hover:opacity-95"
        />
      </div>
    </>
  );
}
