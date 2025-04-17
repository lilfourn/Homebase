"use client"

import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

export default function UpgradeButton({ className, children }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/stripe/create-checkout-session', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      
      const { id } = await res.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      await stripe.redirectToCheckout({ sessionId: id });
    } catch (error) {
      console.error('Error during checkout:', error);
      // You could add error handling UI here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className={`${className || 'btn-primary'}`}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : children || 'Upgrade to Pro'}
    </button>
  );
}