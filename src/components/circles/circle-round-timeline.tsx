"use client";

import { useRef, useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/formatters";

interface Round {
  roundNumber: number;
  status: "completed" | "current" | "upcoming";
  recipientName?: string;
  amount?: number;
}

interface CircleRoundTimelineProps {
  currentRound: number;
  totalRounds: number;
  rounds: Round[];
}

export function CircleRoundTimeline({
  rounds,
}: CircleRoundTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });

    let timeoutId: number | null = null;
    let frameId: number | null = null;

    const debouncedCheckScroll = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = window.requestAnimationFrame(checkScroll);
      }, 100);
    };

    let observer: ResizeObserver | null = null;
    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      observer = new ResizeObserver(debouncedCheckScroll);
      observer.observe(el);
    } else {
      window.addEventListener("resize", debouncedCheckScroll);
    }

    return () => {
      el.removeEventListener("scroll", checkScroll);
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", debouncedCheckScroll);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [rounds]);


  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -200 : 200;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {(canScrollLeft || canScrollRight) && (
        <>
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll("left")}
              className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-md border border-gray-200 hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll("right")}
              className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-md border border-gray-200 hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </>
      )}

      <div
        ref={scrollRef}
        className="flex items-start gap-0 overflow-x-auto pb-4 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {rounds.map((round, index) => {
          const isCompleted = round.status === "completed";
          const isCurrent = round.status === "current";
          const isLast = index === rounds.length - 1;

          return (
            <div key={round.roundNumber} className="flex items-start">
              <div className="flex flex-col items-center min-w-[100px]">
                <div
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    !isCompleted && !isCurrent && "border-gray-300 bg-white text-gray-400",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{round.roundNumber}</span>
                  )}
                  {isCurrent && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                  )}
                </div>

                <div className="mt-2 text-center">
                  {isCurrent && (
                    <span className="block text-xs font-medium text-primary">Current</span>
                  )}
                  {isCompleted && round.recipientName && (
                    <span className="block text-xs font-medium text-gray-900 truncate max-w-[90px]">
                      {round.recipientName}
                    </span>
                  )}
                  {isCompleted && round.amount != null && (
                    <span className="block text-[10px] text-gray-500">
                      {formatCurrency(round.amount, "USDC")}
                    </span>
                  )}
                  {!isCompleted && !isCurrent && (
                    <span className="block text-xs text-gray-400">
                      Round {round.roundNumber}
                    </span>
                  )}
                </div>
              </div>

              {!isLast && (
                <div className="flex items-center pt-5 -mx-1">
                  <div
                    className={cn(
                      "h-0.5 w-12 sm:w-16",
                      isCompleted ? "bg-green-500" : "bg-gray-300",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
