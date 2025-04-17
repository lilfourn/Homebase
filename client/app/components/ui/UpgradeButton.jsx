"use client"

import { loadStripe } from '@stripe/stripe-js';

export default function UpgradeButton() {
  const handleClick = async () => {
    const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
    const { id } = await res.json();
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    await stripe.redirectToCheckout({ sessionId: id });
  };

  return (
    <button onClick={handleClick} className="btn-primary bg-blue-600 text-white rounded-md p-3 w-full font-bold text-sm whitespace-nowrap">
      Get Unlimited Credits
    </button>
  );
}