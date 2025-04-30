import { useState, useEffect } from 'react';
import { auth } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';

export default function useAuth() {
  const [uid, setUid] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUid(user?.uid);
      setLoading(false);
    });
    return unsub; // cleanup
  }, []);

  return { uid, loading };
}
