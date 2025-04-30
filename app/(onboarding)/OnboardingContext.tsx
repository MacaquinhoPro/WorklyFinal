import React, { createContext, useContext, useState } from 'react';

export interface OBData {
  email?: string;
  password?: string;
  firstName?: string;
  education?: string;
  role?: 'searching' | 'hiring';
  qualifications?: string[];
  gallery?: string[];          // URLs locales (se suben luego)
}

interface Ctx {
  data: OBData;
  set: (d: Partial<OBData>) => void;
}

const Ctx = createContext<Ctx>({ data: {}, set: () => {} });

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<OBData>({});
  const set = (d: Partial<OBData>) => setData((prev) => ({ ...prev, ...d }));
  return <Ctx.Provider value={{ data, set }}>{children}</Ctx.Provider>;
};

export const useOB = () => useContext(Ctx);
