'use client';

import { useContext } from 'react';
import { useAgents as useAgentContext } from '../../context/AgentContext';

/**
 * Hook to use agent functionality
 * This is a convenience hook that re-exports the context hook
 * and can be extended with additional logic if needed
 */
export function useAgents() {
  const context = useAgentContext();
  
  // You can add additional logic here if needed
  // For example, computed properties, memoized values, etc.
  
  return context;
}

// Re-export specific hooks for convenience
export { useAgentContext };