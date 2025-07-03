// Sets up a provider for the cached routes and stop json files

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCachedData } from '../../utils/dataCache';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState({ routes: null, stops: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getCachedData()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  return (
    <DataContext.Provider value={{ ...data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
} 