import { useState, useCallback } from 'react';
import binService from '../services/binService';

export default function useBinScan() {
  const [binData, setBinData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const scanBin = useCallback(async (qrValue) => {
    if (!qrValue?.trim()) return;
    setIsLoading(true);
    setError(null);
    setBinData(null);
    try {
      const res = await binService.scanBin(qrValue.trim());
      const data = res.data?.data;
      if (!data) throw new Error('No bin data returned');
      setBinData(data);
      return data;
    } catch (err) {
      const apiError = err.response?.data?.error;
      const message = apiError?.message || err.message || 'Bin not found. Please verify the QR code and try again.';
      const code = apiError?.code || 'SCAN_ERROR';
      setError({ code, message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearScan = useCallback(() => {
    setBinData(null);
    setError(null);
  }, []);

  return { binData, error, isLoading, scanBin, clearScan, setBinData };
}
