import { useCallback, useEffect, useRef, useState } from "react";

// Keep the existing key so saved colors survive the app rename.
const STORAGE_KEY = "pixelroom.color-history";
const EMPTY_HISTORY = { enabled: false, colors: [] };

function normalizeColors(colors) {
  return [
    ...new Set(
      colors
        .filter(
          (color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color),
        )
        .map((color) => color.toLowerCase()),
    ),
  ];
}

function parseHistory(value) {
  const parsed = JSON.parse(value);
  return {
    enabled: parsed?.enabled === true,
    colors: normalizeColors(Array.isArray(parsed?.colors) ? parsed.colors : []),
  };
}

function readHistory() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? null : parseHistory(stored);
}

export default function useColorHistory() {
  const [history, setHistory] = useState(() => {
    try {
      return readHistory() ?? EMPTY_HISTORY;
    } catch {
      return EMPTY_HISTORY;
    }
  });
  const historyRef = useRef(history);
  const storageFailedRef = useRef(false);
  const [error, setError] = useState("");

  const updateHistory = useCallback((update) => {
    let next;
    try {
      // Read the latest saved value before editing so other tabs' changes are retained.
      let stored;
      try {
        if (!storageFailedRef.current) stored = readHistory();
      } catch (readError) {
        if (!(readError instanceof SyntaxError)) throw readError;
      }
      next = update(stored ?? historyRef.current);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      storageFailedRef.current = false;
      setError("");
    } catch {
      next = update(historyRef.current);
      storageFailedRef.current = true;
      setError(
        "Color history could not be saved. Your colors are available for this session.",
      );
    }
    historyRef.current = next;
    setHistory(next);
  }, []);

  useEffect(() => {
    const syncHistory = (event) => {
      if (
        event.storageArea !== window.localStorage ||
        (event.key !== STORAGE_KEY && event.key !== null)
      )
        return;
      let next = EMPTY_HISTORY;
      try {
        if (event.newValue !== null) next = parseHistory(event.newValue);
      } catch {
        // An invalid saved value is treated as an empty history.
      }
      historyRef.current = next;
      storageFailedRef.current = false;
      setHistory(next);
      setError("");
    };
    window.addEventListener("storage", syncHistory);
    return () => window.removeEventListener("storage", syncHistory);
  }, []);

  const setEnabled = useCallback(
    (enabled) => {
      updateHistory((previous) => ({ ...previous, enabled }));
    },
    [updateHistory],
  );

  const remember = useCallback(
    (colors) => {
      if (!historyRef.current.enabled) return;
      const chosen = normalizeColors(Array.isArray(colors) ? colors : [colors]);
      if (!chosen.length) return;
      updateHistory((previous) =>
        previous.enabled
          ? {
              ...previous,
              colors: normalizeColors([...chosen, ...previous.colors]),
            }
          : previous,
      );
    },
    [updateHistory],
  );

  const remove = useCallback(
    (color) => {
      updateHistory((previous) => ({
        ...previous,
        colors: previous.colors.filter(
          (saved) => saved !== color.toLowerCase(),
        ),
      }));
    },
    [updateHistory],
  );

  return { ...history, error, setEnabled, remember, remove };
}
