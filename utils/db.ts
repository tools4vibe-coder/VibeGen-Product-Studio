
import { GeneratedImage, GeneratedVideo, VideoProject } from '../types';

const DB_NAME = 'StyleUnionDB';
const IMG_STORE = 'images';
const VID_STORE = 'videos';
const PROJ_STORE = 'projects';
const VERSION = 2;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMG_STORE)) db.createObjectStore(IMG_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(VID_STORE)) db.createObjectStore(VID_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PROJ_STORE)) db.createObjectStore(PROJ_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveImage = async (image: GeneratedImage) => {
  const db = await openDB();
  const tx = db.transaction(IMG_STORE, 'readwrite');
  tx.objectStore(IMG_STORE).put(image);
  return new Promise((resolve) => tx.oncomplete = resolve);
};

export const getImages = async (): Promise<GeneratedImage[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const request = db.transaction(IMG_STORE).objectStore(IMG_STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
  });
};

export const saveVideo = async (video: GeneratedVideo) => {
  const db = await openDB();
  const tx = db.transaction(VID_STORE, 'readwrite');
  tx.objectStore(VID_STORE).put(video);
  return new Promise((resolve) => tx.oncomplete = resolve);
};

export const getVideos = async (): Promise<GeneratedVideo[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const request = db.transaction(VID_STORE).objectStore(VID_STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
  });
};

export const saveProject = async (project: VideoProject) => {
  const db = await openDB();
  const tx = db.transaction(PROJ_STORE, 'readwrite');
  tx.objectStore(PROJ_STORE).put(project);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getProjects = async (): Promise<VideoProject[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const request = db.transaction(PROJ_STORE).objectStore(PROJ_STORE).getAll();
    request.onsuccess = () =>
      resolve(request.result.sort((a: any, b: any) => (b.updatedAt || b.timestamp) - (a.updatedAt || a.timestamp)));
  });
};

export const getProjectById = async (id: string): Promise<VideoProject | null> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const request = db.transaction(PROJ_STORE).objectStore(PROJ_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
  });
};

export const deleteProject = async (id: string) => {
  const db = await openDB();
  const tx = db.transaction(PROJ_STORE, 'readwrite');
  tx.objectStore(PROJ_STORE).delete(id);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const clearAllData = async () => {
  const db = await openDB();
  const tx = db.transaction([IMG_STORE, VID_STORE, PROJ_STORE], 'readwrite');
  tx.objectStore(IMG_STORE).clear();
  tx.objectStore(VID_STORE).clear();
  tx.objectStore(PROJ_STORE).clear();
};

export const deleteItem = async (storeName: 'images' | 'videos' | 'projects', id: string) => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
};
