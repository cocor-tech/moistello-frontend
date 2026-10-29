/**
 * profile-step.test.tsx
 *
 * Component tests for <ProfileStep> covering:
 *  - rendering the step form
 *  - language selector display
 *  - submit button state
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileStep } from "../auth/profile-step";

vi.mock("@/lib/locale/context", () => ({
  useTranslate: () => ({
    t: (key: string) => key,
    i18n: { locale: "en", changeLanguage: vi.fn() },
  }),
}));

describe("ProfileStep", () => {
  it("renders the profile step form", () => {
    const onSubmit = vi.fn();
    render(
      <ProfileStep
        displayName="Test User"
        language="en"
        onUpdateLanguage={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("shows the display name", () => {
    render(
      <ProfileStep
        displayName="Test User"
        language="en"
        onUpdateLanguage={vi.fn()}
        onSubmit={() => {}},
      />,
    );

    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });
});