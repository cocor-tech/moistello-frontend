"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useId,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  menuId: string;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(
  undefined,
);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within a <Dropdown>");
  }
  return context;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function Dropdown({
  trigger,
  children,
  className,
  align = "left",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, []);

  const getMenuItems = useCallback((): HTMLElement[] => {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ),
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (
          e.key === "ArrowDown" ||
          e.key === "ArrowUp" ||
          e.key === "Enter" ||
          e.key === " "
        ) {
          e.preventDefault();
          setIsOpen(true);
          setActiveIndex(0);
        }
        return;
      }

      const items = getMenuItems();
      if (items.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
          setActiveIndex(nextIndex);
          items[nextIndex]?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevIndex =
            activeIndex < 0
              ? items.length - 1
              : (activeIndex - 1 + items.length) % items.length;
          setActiveIndex(prevIndex);
          items[prevIndex]?.focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          setActiveIndex(0);
          items[0]?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          const lastIndex = items.length - 1;
          setActiveIndex(lastIndex);
          items[lastIndex]?.focus();
          break;
        }
        case "Escape": {
          e.preventDefault();
          closeMenu();
          break;
        }
        case "Tab": {
          setIsOpen(false);
          setActiveIndex(-1);
          break;
        }
      }
    },
    [isOpen, activeIndex, getMenuItems, closeMenu],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      requestAnimationFrame(() => {
        const items = getMenuItems();
        if (items.length > 0) {
          items[0]?.focus();
          setActiveIndex(0);
        } else {
          menuRef.current?.focus();
        }
      });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClickOutside, getMenuItems]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        setIsOpen,
        triggerRef,
        menuRef,
        activeIndex,
        setActiveIndex,
        menuId,
      }}
    >
      <div
        ref={containerRef}
        className={cn("relative inline-block", className)}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={triggerRef}
          onClick={() => {
            if (isOpen) {
              closeMenu();
            } else {
              setIsOpen(true);
              setActiveIndex(0);
            }
          }}
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
        >
          {trigger}
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              id={menuId}
              role="menu"
              tabIndex={-1}
              aria-orientation="vertical"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "absolute z-50 mt-1 min-w-[200px] overflow-hidden rounded-2xl glass-strong p-1.5 focus:outline-none",
                align === "right"
                  ? "right-0 origin-top-right"
                  : "left-0 origin-top-left",
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DropdownContext.Provider>
  );
}

export interface DropdownItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  destructive?: boolean;
}

export function DropdownItem({
  icon,
  destructive = false,
  className,
  children,
  onClick,
  ...props
}: DropdownItemProps) {
  const { setIsOpen, triggerRef } = useDropdownContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <button
      role="menuitem"
      type="button"
      tabIndex={-1}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors duration-150",
        "focus-visible:outline-none focus:bg-white/10 focus-visible:bg-white/10",
        destructive
          ? "text-destructive hover:bg-red-500/10 focus:bg-red-500/10"
          : "text-foreground/80 hover:glass-whisper hover:text-foreground",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          className="shrink-0 text-muted-foreground w-4 h-4"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
