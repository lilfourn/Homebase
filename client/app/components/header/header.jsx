import Link from "next/link"


export default function Header() {
  return (
      <div className = "flex items-center justify-between w-full pt-2 pl-2 pr-2">
          <div className = "flex items-center justify-between w-32">
              <Link href="/" legacyBehavior>
                  <img src = "/brand/homebase.png" className = "w-32 ml-2 min-h-auto transition-all ease-in-out duration-300 hover:scale-105 cursor-pointer hover:opacity-95" alt="Homebase Logo"/>
              </Link>
          </div>
          <div className = "mr-4">
              <Link href="/sign-in" legacyBehavior>
                  <button className = 'cursor-pointer border-none background-transparent p-6 font-bold min-h-9 mr-4 hover:scale-105 transition-all ease-in-out duration-300'>Sign In</button>
              </Link>
              <Link href="/sign-up" legacyBehavior>
                  <button className = 'cursor-pointer bg-blue-600 text-white rounded-xl p-2.5 font-bold min-h-9 mr-4 hover:scale-105 transition-all ease-in-out duration-300'>Create Account</button>
              </Link>
          </div>
      </div>
  );
}