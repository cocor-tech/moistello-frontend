"use client";

import React, { type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

export interface MotionProviderProps {
  children: ReactNode;
}

/**
 * MotionProvider enforces system prefers-reduced-motion settings globally
 * across all Framer Motion animations in the application (WCAG 2.3.3 compliance).
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
