import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, Tooltip, IconButton, Chip, Divider } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import BugReportIcon from '@mui/icons-material/BugReport';

const ERROR_LABELS = {
  NotAllowedError: 'Camera permission was denied. Allow camera access in your browser settings and reload the page.',
  NotFoundError: 'No camera was found on this device. Connect a camera or use manual entry.',
  NotReadableError: 'Camera is already in use by another application. Close other apps using the camera and try again.',
  SecurityError: 'Camera access is blocked by browser security policy. Access the site via HTTPS or localhost.',
  OverconstrainedError: 'The requested camera mode is not available on this device.',
  NotSupportedError: 'Camera is not supported by this browser. Use Chrome or Edge on Android.',
  AbortError: 'Camera access was aborted. Try again.',
  InvalidStateError: 'Camera is in an invalid state. Try reloading the page.',
  TypeError: 'A camera configuration parameter was invalid.',
};

function formatError(err) {
  const name = err?.name || 'UnknownError';
  const message = err?.message || String(err);
  const label = ERROR_LABELS[name] || `Camera error: ${message}`;
  return { name, message, label };
}

export default function QRScanner({ onScan, isScanning = true }) {
  const [manualValue, setManualValue] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [errorName, setErrorName] = useState(null);
  const [camFound, setCamFound] = useState(null);
  const [diag, setDiag] = useState(null);
  const [showDiag, setShowDiag] = useState(false);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);

  const startCamera = useCallback(async () => {
    processingRef.current = false;
    setCameraError(null);
    setErrorName(null);

    const info = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isSecureContext: window.isSecureContext,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      cameraPermission: 'unknown',
      camerasDetected: 0,
      selectedCameraId: null,
    };

    console.group('QR Camera Startup');
    console.log('URL:', info.url);
    console.log('UserAgent:', info.userAgent);
    console.log('SecureContext:', info.isSecureContext);
    console.log('mediaDevices:', info.hasMediaDevices);
    console.log('getUserMedia:', info.hasGetUserMedia);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new DOMException('getUserMedia is not available in this browser.', 'NotSupportedError');
      }

      if (!window.isSecureContext) {
        throw new DOMException(
          'Camera access requires HTTPS or localhost. Current origin is not secure.',
          'SecurityError'
        );
      }

      if (navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'camera' });
          info.cameraPermission = perm.state;
          console.log('Camera permission state:', perm.state);
        } catch (permErr) {
          console.warn('Permission query failed:', permErr);
        }
      }

      console.log('Requesting camera permission (triggers browser dialog)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => {
        console.log('Stopping temp track:', track.kind, track.label);
        track.stop();
      });
      console.log('Camera permission granted');

      const { Html5Qrcode } = await import('html5-qrcode');
      console.log('html5-qrcode imported');

      let config;
      try {
        const cameras = await Html5Qrcode.getCameras();
        info.camerasDetected = cameras.length;
        info.cameras = cameras.map(c => ({ id: c.id, label: c.label }));
        setCamFound(cameras.length);
        console.log('Cameras detected:', cameras.length, cameras.map(c => `"${c.label}"`).join(', '));

        if (cameras.length === 0) {
          throw new DOMException('No camera found on this device.', 'NotFoundError');
        }

        const rear = cameras.find(c => {
          const l = c.label.toLowerCase();
          return l.includes('back') || l.includes('rear') || l.includes('environment');
        });
        const pick = rear || cameras[0];
        config = pick.id;
        info.selectedCameraId = pick.id;
        info.selectedCameraLabel = pick.label;
        console.log('Selected camera:', pick.label || pick.id);
      } catch (enumErr) {
        console.error('getCameras() failed:');
        console.error('  name:', enumErr.name);
        console.error('  message:', enumErr.message);
        if (import.meta.env.DEV) console.error('  stack:', enumErr.stack);
        config = { facingMode: 'environment' };
        info.cameraEnumFallback = true;
        info.cameraEnumError = `${enumErr.name}: ${enumErr.message}`;
        setCamFound(-1);
      }

      setDiag(info);

      scannerRef.current = new Html5Qrcode('qr-reader');
      console.log('Starting scanner...');
      await scannerRef.current.start(
        config,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (decodedText && isScanning && !processingRef.current && mountedRef.current) {
            processingRef.current = true;
            Promise.resolve(onScan(decodedText)).finally(() => {
              if (mountedRef.current) {
                processingRef.current = false;
              }
            });
          }
        },
        () => {}
      );
      console.log('Scanner started successfully');
    } catch (err) {
      console.error('Camera startup failed:');
      console.error('  name:', err.name);
      console.error('  message:', err.message);
      if (import.meta.env.DEV) console.error('  stack:', err.stack);
      const { name, label, message } = formatError(err);
      info.errorName = name;
      info.errorMessage = message;
      info.errorStack = err.stack;
      setDiag(info);
      setErrorName(name);
      setCameraError(label);
      setShowManual(true);
    } finally {
      console.groupEnd();
    }
  }, [onScan, isScanning]);

  useEffect(() => {
    mountedRef.current = true;
    if (isScanning) {
      startCamera();
    }
    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isScanning]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualValue.trim()) {
      onScan(manualValue.trim());
      setManualValue('');
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <QrCodeScannerIcon color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Scan Bin QR Code</Typography>
        {import.meta.env.DEV && diag && (
          <Tooltip title="Toggle diagnostics">
            <IconButton size="small" onClick={() => setShowDiag(p => !p)}>
              <BugReportIcon fontSize="small" color={showDiag ? 'primary' : 'disabled'} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {errorName && (
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
            {errorName}
          </Typography>
          {cameraError}
        </Alert>
      )}

      {import.meta.env.DEV && showDiag && diag && (
        <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            QR Scanner Diagnostics
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.25 }}>
            {[
              ['URL', diag.url ? `${diag.url.substring(0, 40)}...` : '—'],
              ['Browser', diag.userAgent?.split('/')[0] || '—'],
              ['Platform', diag.platform || '—'],
              ['Secure Context', String(diag.isSecureContext)],
              ['mediaDevices', String(diag.hasMediaDevices)],
              ['getUserMedia', String(diag.hasGetUserMedia)],
              ['Cam Permission', diag.cameraPermission],
              ['Cam Detected', camFound === -1 ? 'enum failed' : String(camFound)],
              ['Selected Cam', diag.selectedCameraId ? `${(diag.selectedCameraLabel || diag.selectedCameraId).substring(0, 30)}...` : 'facingMode'],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>{k}:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>{v}</Typography>
              </Box>
            ))}
          </Box>
          {diag.errorName && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                Error: {diag.errorName} — {diag.errorMessage}
              </Typography>
              {diag.errorStack && (
                <Box
                  component="pre"
                  sx={{ fontSize: 10, mt: 0.5, p: 0.5, bgcolor: 'grey.100', borderRadius: 0.5, overflow: 'auto', maxHeight: 120 }}
                >
                  {diag.errorStack}
                </Box>
              )}
            </>
          )}
        </Paper>
      )}

      <Box
        id="qr-reader"
        sx={{
          width: '100%',
          maxWidth: 320,
          mx: 'auto',
          mb: 2,
          minHeight: cameraError ? 0 : 240,
          '& video': { borderRadius: 1 },
        }}
      />

      {!showManual ? (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<KeyboardIcon />}
          onClick={() => setShowManual(true)}
          sx={{ minHeight: 48 }}
        >
          Enter QR Code Manually
        </Button>
      ) : (
        <Box component="form" onSubmit={handleManualSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="medium"
            placeholder="Paste or type QR code value"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!manualValue.trim()}
            sx={{ minWidth: 80, minHeight: 56 }}
          >
            Scan
          </Button>
        </Box>
      )}
    </Paper>
  );
}
