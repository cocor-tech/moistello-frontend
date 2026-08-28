import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MotionProvider } from "@/providers/motion-provider";
import { motion } from "framer-motion";

describe("Reduced Motion Support (WCAG 2.3.3)", () => {
  it("renders components wrapped in MotionProvider successfully", () => {
    render(
      <MotionProvider>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          data-testid="motion-box"
        >
          Animated Content
        </motion.div>
      </MotionProvider>
    );

    const box = screen.getByTestId("motion-box");
    expect(box).toBeInTheDocument();
    expect(box).toHaveTextContent("Animated Content");
  });
});
