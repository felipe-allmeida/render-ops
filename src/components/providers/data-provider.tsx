'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getValueByPath, setValueByPath, deepClone } from '@/lib/utils';

interface DataContextType {
  data: Record<string, unknown>;
  getValue: (path: string) => unknown;
  setValue: (path: string, value: unknown) => void;
  setMultiple: (updates: Record<string, unknown>) => void;
  resetData: (newData?: Record<string, unknown>) => void;
}

const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  initialData?: Record<string, unknown>;
  children: React.ReactNode;
}

export function DataProvider({ initialData = {}, children }: DataProviderProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);

  const getValue = useCallback(
    (path: string) => {
      return getValueByPath(data, path);
    },
    [data]
  );

  const setValue = useCallback((path: string, value: unknown) => {
    setData((prevData) => {
      const newData = deepClone(prevData);
      setValueByPath(newData, path, value);
      return newData;
    });
  }, []);

  const setMultiple = useCallback((updates: Record<string, unknown>) => {
    console.log('[DataProvider] setMultiple called with:', Object.keys(updates));
    setData((prevData) => {
      const newData = deepClone(prevData);
      Object.entries(updates).forEach(([path, value]) => {
        console.log(`[DataProvider] Setting ${path}:`, typeof value === 'object' ? JSON.stringify(value).slice(0, 100) + '...' : value);
        setValueByPath(newData, path, value);
      });
      console.log('[DataProvider] New data form:', newData.form);
      return newData;
    });
  }, []);

  const resetData = useCallback((newData: Record<string, unknown> = {}) => {
    setData(newData);
  }, []);

  const contextValue = useMemo(
    () => ({
      data,
      getValue,
      setValue,
      setMultiple,
      resetData,
    }),
    [data, getValue, setValue, setMultiple, resetData]
  );

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export function useDataValue(path: string) {
  const { getValue } = useData();
  return getValue(path);
}

export function useSetData() {
  const { setValue } = useData();
  return setValue;
}
