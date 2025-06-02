"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useMemo } from "react";
import { getConvexConfig, convexLog } from "../config/convexConfig";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const config = getConvexConfig();
  
  // Create Convex client with environment-specific URL
  const convex = useMemo(() => {
    convexLog("Initializing Convex client", { url: config.url });
    return new ConvexReactClient(config.url);
  }, [config.url]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}