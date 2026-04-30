// src/lib/api.ts
import { User } from '../types';

const API_BASE = '/api/db';

const getHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = localStorage.getItem('wisvale-user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      if (userData.uid) headers['x-user-uid'] = userData.uid;
    } catch (e) {}
  }
  return headers;
};

export const api = {
  get: async (collection: string, id?: string, query?: Record<string, string>): Promise<any> => {
    let url = id ? `${API_BASE}/${collection}/${id}` : `${API_BASE}/${collection}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  post: async (collection: string, data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  put: async (collection: string, id: string, data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  delete: async (collection: string, id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  auth: {
    login: async (email: string): Promise<User> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error(`Auth error: ${res.status}`);
      return res.json();
    }
  },

  storage: {
    upload: async (file: File): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error(`Upload error: ${res.status}`);
      return res.json();
    }
  },

  db: {
    get: async (collection: string, query?: Record<string, string>) => api.get(collection, undefined, query),
    getById: async (collection: string, id: string) => api.get(collection, id),
    create: async (collection: string, data: any) => api.post(collection, data),
    update: async (collection: string, id: string, data: any) => api.put(collection, id, data),
    delete: async (collection: string, id: string) => api.delete(collection, id)
  }
};

export async function awardPoints(points: number, userId: string) {
  try {
    const user = await api.get('users', userId);
    await api.put('users', userId, {
      points: (user.points || 0) + points
    });
  } catch (err) {
    console.error('Failed to award points:', err);
  }
}

export async function trackTokens(tokens: number, userId: string) {
  try {
    const user = await api.get('users', userId);
    await api.put('users', userId, {
      tokensUsed: (user.tokensUsed || 0) + tokens
    });
  } catch (err) {
    console.error('Failed to track tokens:', err);
  }
}
