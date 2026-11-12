import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRecentImage,
  deleteRecentImage,
  listRecentImages,
  storeRecentImage,
} from "./recentImages.js";

export default function useRecentImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState("");
  const revisionRef = useRef(0);
  const mountedRef = useRef(false);
  const channelRef = useRef(null);
  const removedRef = useRef(new Map());
  const failedActionRef = useRef(null);

  const refresh = useCallback(async () => {
    const revision = ++revisionRef.current;
    try {
      const saved = await listRecentImages();
      if (mountedRef.current && revision === revisionRef.current)
        setImages(saved);
    } catch {
      if (mountedRef.current && revision === revisionRef.current) {
        setError("Recent images could not be opened on this device.");
      }
    } finally {
      if (mountedRef.current && revision === revisionRef.current)
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const channel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel("pixelforge-recent-images")
        : null;
    channelRef.current = channel;
    if (channel)
      channel.onmessage = ({ data }) => {
        if (data.removed) removedRef.current.set(data.removed, data.at);
        refresh();
      };
    window.addEventListener("focus", refresh);
    return () => {
      mountedRef.current = false;
      revisionRef.current++;
      channel?.close();
      channelRef.current = null;
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const save = useCallback(
    async (image) => {
      if ((removedRef.current.get(image.id) ?? 0) >= image.openedAt) return;
      await storeRecentImage(image);
      failedActionRef.current = null;
      if (mountedRef.current) setError("");
      channelRef.current?.postMessage({ changed: true });
      await refresh();
    },
    [refresh],
  );

  const remember = useCallback(
    async (source, name, canvas) => {
      const openedAt = performance.timeOrigin + performance.now();
      let image;
      setSaving((count) => count + 1);
      try {
        image = await createRecentImage(source, name, canvas, openedAt);
        await save(image);
      } catch {
        failedActionRef.current = image ? { type: "save", image } : null;
        if (mountedRef.current)
          setError(
            "This image could not be saved to recent images. You can keep editing and exporting it.",
          );
      } finally {
        if (mountedRef.current) setSaving((count) => count - 1);
      }
    },
    [save],
  );

  const remove = useCallback(
    async (id) => {
      const at = performance.timeOrigin + performance.now();
      removedRef.current.set(id, at);
      channelRef.current?.postMessage({ removed: id, at });
      try {
        await deleteRecentImage(id);
        failedActionRef.current = null;
        if (mountedRef.current) setError("");
        channelRef.current?.postMessage({ changed: true });
        await refresh();
      } catch {
        failedActionRef.current = { type: "remove", id };
        if (mountedRef.current)
          setError(
            "This image could not be removed from recent images. Try again.",
          );
      }
    },
    [refresh],
  );

  const retry = useCallback(async () => {
    try {
      if (failedActionRef.current?.type === "save")
        await save(failedActionRef.current.image);
      else if (failedActionRef.current?.type === "remove")
        await remove(failedActionRef.current.id);
      else {
        if (mountedRef.current) setError("");
        await refresh();
      }
    } catch {
      if (mountedRef.current)
        setError(
          "Recent images could not be saved on this device. Try freeing browser storage and retrying.",
        );
    }
  }, [refresh, save, remove]);

  return {
    images,
    loading,
    saving: saving > 0,
    error,
    remember,
    remove,
    retry,
  };
}
