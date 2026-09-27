"use client";

import { logger } from "@/lib/logger"
import React, { Component } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl glass-premium p-10 text-center max-w-md w-full",
              "depth-4",
              "border border-white/[0.06]",
            )}
          >
            {/* Icon */}
            <motion.div
              initial={{ rotate: -12, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 ring-1 ring-warning/20"
            >
              <AlertTriangle className="h-8 w-8 text-warning" aria-hidden="true" />
            </motion.div>

            {/* Title */}
            <h2 className="mb-2 font-heading text-xl font-bold text-foreground">
              Something went wrong
            </h2>

            {/* Error message */}
            <p className="mb-6 max-w-sm text-sm text-muted-foreground font-body leading-relaxed">
              {this.state.error?.message ||
                "An unexpected error occurred. Please try again."}
            </p>

            {/* Retry button */}
            <Button
              variant="premium"
              size="md"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={this.handleRetry}
              className="rounded-xl font-heading"
            >
              Try Again
            </Button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
