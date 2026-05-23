// admin/src/lib/materialsStorage.ts
// CRUD de materiales guardados en localStorage.

import type { Material } from '@/types/material';

const KEY = 'acacia.admin.materials';

function load(): Material[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Material[];
  } catch {
    return [];
  }
}

function save(items: Material[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listMaterials(): Material[] {
  return load();
}

export function addMaterial(m: Omit<Material, 'id'>): Material {
  const item: Material = {
    ...m,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  save([...load(), item]);
  return item;
}

export function updateMaterial(id: string, patch: Partial<Omit<Material, 'id'>>): void {
  save(load().map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export function deleteMaterial(id: string): void {
  save(load().filter((m) => m.id !== id));
}
