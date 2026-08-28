import { Variants } from "framer-motion";
import { useReducedMotion } from "framer-motion";

export const STAGGER_CHILDREN_LIMIT = 50;

export function getContainerVariants(count: number): Variants {
  const stagger = count > STAGGER_CHILDREN_LIMIT ? 0 : 0.03;
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger } },
  };
}

export const defaultItemVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  show: { opacity: 1, y: 0 },
};

export function useListMotion(count: number) {
  const shouldReduce = useReducedMotion();
  const variants = getContainerVariants(count);
  return {
    shouldReduce,
    variants,
  };
}
