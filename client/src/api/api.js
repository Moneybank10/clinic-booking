const API_URL = import.meta.env.VITE_API_URL;

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || 'Something went wrong');
    error.status = res.status;
    throw error;
  }

  return data;
}