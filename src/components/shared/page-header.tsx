"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/cn";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
    >
      <div className="min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 mb-3" aria-label="Breadcrumb">
            <Link
              href="/"
             aria-label="Home"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              <Home className="h-3 w-3" aria-hidden="true" />
            </Link>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={index}>
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 truncate max-w-[140px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? "page" : undefined}
                      className={cn(
                        "text-xs truncate max-w-[180px]",
                        isLast
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {/* Title */}
        <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold gradient-text-extended tracking-tight">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="mt-1.5 text-sm md:text-base text-muted-foreground font-body max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 flex items-center gap-2"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
