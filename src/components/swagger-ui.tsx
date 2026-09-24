"use client";

import { logger } from "@/lib/logger"
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useState, useEffect } from "react";

export function SwaggerUIPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem("swagger_authorization");
        if (stored) {
          const parsed = JSON.parse(stored);
          setIsAuthorized(!!parsed?.Authorization);
        }
      } catch (e) {
        logger.warn("[swagger] Failed to read auth state:", e)
      }
    };
    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  return (
    <div>
      {!isAuthorized && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">
            Fill in the lock icon above with your Bearer token to test authenticated endpoints.
          </p>
        </div>
      )}
      <SwaggerUI
        url="/api/swagger"
        docExpansion="list"
        defaultModelsExpandDepth={0}
        defaultModelExpandDepth={2}
        persistAuthorization={true}
        layout="BaseLayout"
        tryItCredentialsProvider={{
          keys: {
            apiKey: {
              name: "Authorization",
              location: "header",
              enabled: true,
            },
          },
        }}
      />
    </div>
  );
}