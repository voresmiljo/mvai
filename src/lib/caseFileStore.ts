const DB_NAME = "mvai";
const STORE = "case-files";

type StoredFile = {
  name: string;
  type: string;
  bytes: ArrayBuffer;
};

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCaseFile(id: string, file: File): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openStore();
  const bytes = await file.arrayBuffer();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ name: file.name, type: file.type, bytes } satisfies StoredFile, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadCaseFile(id: string): Promise<File | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openStore();
  const row = await new Promise<StoredFile | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as StoredFile | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!row?.bytes || !row.name) return null;
  return new File([row.bytes], row.name, { type: row.type || "application/octet-stream" });
}
