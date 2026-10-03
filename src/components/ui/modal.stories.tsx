import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

const meta: Meta<typeof Modal> = {
  title: "UI/Modal",
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          "Portalled overlay dialog rendered into `document.body` with a blurred scrim. Uses a focus trap, closes on Escape and on backdrop click, and wires `aria-modal`, `aria-labelledby` and `aria-describedby` to its title/description. Scroll-locks the body while open.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "xl", "full"] },
  },
  // The overlay covers the viewport, so opt out of the centered docs canvas.
  decorators: [
    (Story) => (
      <div className="min-h-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Modal>;

/** Renders a trigger button that opens the modal, so the story is interactive. */
function ModalHarness({
  title,
  description,
  size,
  withFooter = true,
}: {
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  withFooter?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        size={size}
        footer={
          withFooter ? (
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </>
          ) : undefined
        }
      >
        <p className="text-sm text-muted-foreground">
          Modal content is scrollable when it exceeds the max height. Focus is trapped
          inside the dialog and returned to the trigger on close.
        </p>
      </Modal>
    </>
  );
}

export const Default: Story = {
  args: { title: "Confirm transaction", isOpen: false, onClose: () => {}, size: "md" },
  render: (args) => (
    <ModalHarness
      title={args.title}
      description={args.description}
      size={args.size}
      withFooter={Boolean(args.footer)}
    />
  ),
};

export const WithDescription: Story = {
  args: {
    title: "Leave this circle?",
    description:
      "Leaving removes your membership and returns your contribution to your wallet balance.",
    isOpen: false,
    onClose: () => {},
    size: "sm",
  },
  render: (args) => (
    <ModalHarness
      title={args.title}
      description={args.description}
      size={args.size}
      withFooter={Boolean(args.footer)}
    />
  ),
};

export const WithoutFooter: Story = {
  args: { title: "Scan QR to connect", isOpen: false, onClose: () => {}, size: "md" },
  render: (args) => <ModalHarness title={args.title} size={args.size} withFooter={false} />,
};

export const Large: Story = {
  args: {
    title: "Proposal execution payload",
    description: "Review the contract call before signing.",
    isOpen: false,
    onClose: () => {},
    size: "xl",
  },
  render: (args) => (
    <ModalHarness
      title={args.title}
      description={args.description}
      size={args.size}
      withFooter={Boolean(args.footer)}
    />
  ),
};
