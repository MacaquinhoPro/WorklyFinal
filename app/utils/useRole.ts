import { useState, useEffect } from 'react';
import { db } from './firebaseconfig';
import { doc, onSnapshot } from 'firebase/firestore';

export default function useRole(uid?: string) {
  const [role, setRole] = useState<string | undefined>();
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setRole(undefined); setRoleLoading(false); return; }

    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      setRole(snap.data()?.role);
      setRoleLoading(false);
    });
    return unsub;
  }, [uid]);

  return { role, roleLoading };
}
