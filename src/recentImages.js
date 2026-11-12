export const RECENT_IMAGE_LIMIT = 10;
const DATABASE_NAME = "pixelforge-images";
const STORE_NAME = "recent-images";
let databasePromise;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      let blocked = false;
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onblocked = () => {
        blocked = true;
        reject(new Error("Close other PixelForge tabs and try again."));
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        if (blocked) {
          database.close();
          return;
        }
        database.onversionchange = () => {
          database.close();
          databasePromise = undefined;
        };
        resolve(database);
      };
    });
    databasePromise.catch(() => {
      databasePromise = undefined;
    });
  }
  return databasePromise;
}

function newestFirst(first, second) {
  return second.openedAt - first.openedAt || first.id.localeCompare(second.id);
}

export async function listRecentImages() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    transaction.oncomplete = () => resolve(request.result.sort(newestFirst));
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function storeRecentImage(image) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const existing = request.result;
      const previous = existing.find((entry) => entry.id === image.id);
      const latest =
        previous && previous.openedAt > image.openedAt ? previous : image;
      const recent = [
        ...existing.filter((entry) => entry.id !== image.id),
        latest,
      ]
        .sort(newestFirst)
        .slice(0, RECENT_IMAGE_LIMIT);
      const retained = new Set(recent.map((entry) => entry.id));
      for (const entry of existing) {
        if (!retained.has(entry.id)) store.delete(entry.id);
      }
      if (retained.has(image.id)) store.put(latest);
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteRecentImage(id) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function createRecentImage(source, name, canvas, openedAt) {
  const thumbnailCanvas = document.createElement("canvas");
  const scale = Math.min(1, 320 / canvas.width, 220 / canvas.height);
  thumbnailCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  thumbnailCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  thumbnailCanvas
    .getContext("2d")
    .drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
  const thumbnail = await new Promise((resolve) =>
    thumbnailCanvas.toBlob(resolve, "image/webp", 0.8),
  );
  if (!thumbnail) throw new Error("The image thumbnail could not be created.");

  let blob = source;
  if (!(source instanceof Blob)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error("The original image could not be saved.");
    blob = await response.blob();
  }
  let id;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await blob.arrayBuffer(),
    );
    id = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  } else {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return {
    id,
    name,
    blob,
    thumbnail,
    width: canvas.width,
    height: canvas.height,
    openedAt,
  };
}
