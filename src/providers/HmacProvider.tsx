import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ensureHmacKey, clearHmacKeyCache } from "../lib/wallet/hmac";

type HmacContextValue = {
  key: Uint8Array | null;
  ready: boolean;
  refresh: () => Promise<Uint8Array | null>;
  invalidate: () => void;
};

const HmacContext = createContext<HmacContextValue>({
  key: null,
  ready: false,
  refresh: async () => null,
  invalidate: () => {},
});

export function HmacProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const k = await ensureHmacKey();
      if (!mounted) return;
      setKey(k);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    clearHmacKeyCache();
    const k = await ensureHmacKey();
    setKey(k);
    setReady(true);
    return k;
  }, []);

  const invalidate = useCallback(() => {
    clearHmacKeyCache();
    setKey(null);
    setReady(false);
  }, []);

  return (
    <HmacContext.Provider value={{ key, ready, refresh, invalidate }}>
      {children}
    </HmacContext.Provider>
  );
}

export function useHmac() {
  return useContext(HmacContext);
}

export default HmacProvider;
