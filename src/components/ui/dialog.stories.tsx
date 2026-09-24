import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

const meta: Meta = {
  title: "UI/Dialog",
  parameters: {
    docs: {
      description: {
        component:
          "Modal dialog rendered in a portal with a blurred backdrop, focus trap, Escape-to-close and scroll lock. Ensure the trigger passes `ariaLabel` or `ariaLabelledBy` for accessibility.",
      },
    },
    a11y: { disable: true },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog isOpen={open} onClose={() => setOpen(false)} ariaLabel="Join circle">
          <div className="w-full max-w-md rounded-2xl glass p-6">
            <h2 className="font-heading text-lg text-foreground mb-2">Join this circle?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You will be added to the member roster and the first contribution
              will reserve your slot.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Join
              </Button>
            </div>
          </div>
        </Dialog>
      </>
    );
  },
};