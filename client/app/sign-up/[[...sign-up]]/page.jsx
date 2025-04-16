import { SignUp } from '@clerk/nextjs'
import BackButton from '@/app/components/ui/backButton'
import Link from 'next/link'

export default function Page() {
  return (
    <div className = "h-screen flex items-center justify-center">
      <Link href="/"><span  className="absolute top-2 left-2"><BackButton/></span></Link>
      <SignUp signUpForceRedirectUrl='/dashboard'/>
      <img src="/brand/homebase.png" alt="Homebase Logo" className="w-32 absolute top-2 right-2 transition-all ease-in-out duration-300 hover:scale-105 cursor-pointer hover:opacity-95"/>
    </div>
  )
}