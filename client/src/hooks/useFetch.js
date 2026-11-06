import { useEffect, useState } from 'react';
import { api } from '../api/api';

export function useFetch(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const result = await api(path);
        if (!ignore) {
          setData(result);
          setError('');
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [path, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  return { data, loading, error, reload };
}