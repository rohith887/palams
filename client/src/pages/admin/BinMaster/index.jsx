import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, IconButton, Tooltip, Alert, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Divider, Chip, LinearProgress, Paper, Snackbar, Portal,
} from '@mui/material';
import {
  Visibility as VisibilityIcon, Edit as EditIcon, Delete as DeleteIcon,
  Inventory2 as Inventory2Icon, Download as DownloadIcon, Print as PrintIcon,
  Search as SearchIcon, QrCode as QrCodeIcon, ContentCopy as ContentCopyIcon,
  Close as CloseIcon, Refresh as RefreshIcon, WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import StatusChip from '../../../components/common/StatusChip';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import useAuth from '../../../hooks/useAuth';
import { useNotification } from '../../../contexts/NotificationContext';
import binService from '../../../services/binService';

const QR_BASE =
  import.meta.env.VITE_API_BASE_URL || window.location.origin;

const getQrUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http')
    ? path
    : `${QR_BASE}${path}`;
};
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

function formatBinCode(binCode) {
  if (!binCode) return null;
  return String(binCode).toUpperCase();
}

// ─── QR Preview Dialog ─────────────────────────────────────────────────────

function QrPreviewDialog({ open, bin, onClose, onRegenerate }) {
  const { notifySuccess, notifyFromApiError } = useNotification();
  const [regenerating, setRegenerating] = useState(false);

  if (!bin) return null;

  const binCode = bin.Bin_Code || bin.Bin_Number;
  const qrImagePath = bin.QR_Image;
  const qrSrc = qrImagePath
    ? (qrImagePath.startsWith('http') ? qrImagePath : `${QR_BASE}${qrImagePath}`)
    : null;

  const handleDownload = () => {
    if (!qrSrc) return;
    try {
      const a = document.createElement('a');
      a.href = qrSrc;
      a.download = `${binCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notifySuccess(`QR code for ${binCode} downloaded`);
    } catch {
      notifyFromApiError('Failed to download QR code');
    }
  };

  const handlePrint = () => {
    if (!qrSrc) return;
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>PBLMS — QR Label — ${binCode}</title>
      <style>
        @page { size: A6; margin: 8mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          display: flex; justify-content: center; align-items: center;
          min-height: 100vh; background: #fff;
        }
        .label {
          text-align: center; padding: 24px; max-width: 105mm;
          border: 2px dashed #D8E2EC; border-radius: 12px;
        }
        .logo {
          font-size: 18px; font-weight: 800; color: #0F4C81;
          letter-spacing: 3px; margin-bottom: 4px;
        }
        .subtitle {
          font-size: 9px; color: #607080; margin-bottom: 16px;
          text-transform: uppercase; letter-spacing: 2px;
        }
        .qr-wrapper {
          display: inline-block; padding: 12px;
          border: 1px solid #D8E2EC; border-radius: 8px;
          background: #fff;
        }
        img { width: 180px; height: 180px; display: block; }
        .code {
          font-size: 26px; font-weight: 700; margin-top: 12px;
          letter-spacing: 3px; color: #243447; font-family: 'Courier New', monospace;
        }
        .meta { margin-top: 12px; }
        .meta-row {
          display: flex; justify-content: space-between;
          font-size: 10px; color: #607080; padding: 3px 0;
          border-bottom: 1px dotted #E0E0E0;
        }
        .meta-row:last-child { border-bottom: none; }
        .meta-label { font-weight: 600; color: #243447; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .label { border: 2px dashed #D8E2EC; }
        }
      </style></head><body>
        <div class="label">
          <div class="logo">PBLMS</div>
          <div class="subtitle">Pharmaceutical Bin Lifecycle</div>
          <div class="qr-wrapper">
            <img src="${qrSrc}" alt="${binCode}" crossorigin="anonymous" />
          </div>
          <div class="code">${binCode}</div>
          <div class="meta">
            <div class="meta-row"><span class="meta-label">Bin Number</span><span>${bin.Bin_Number || '\u2014'}</span></div>
            <div class="meta-row"><span class="meta-label">Type</span><span>${bin.Bin_Type_Name || '\u2014'}</span></div>
            <div class="meta-row"><span class="meta-label">Category</span><span>${bin.Bin_Category_Name || '\u2014'}</span></div>
            ${bin.Capacity != null ? `<div class="meta-row"><span class="meta-label">Capacity</span><span>${bin.Capacity} ${bin.Capacity_Unit || ''}</span></div>` : ''}
          </div>
        </div>
        <script>window.onload=function(){window.print();window.close();};<\/script>
      </body></html>
    `);
    printWin.document.close();
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await binService.regenerateQr(bin.Bin_ID);
      const updated = res.data?.data;
      if (onRegenerate) onRegenerate(bin.Bin_ID, updated);
      notifySuccess(`QR code regenerated for ${binCode}`);
    } catch (e) {
      notifyFromApiError(e.response?.data?.error || 'Failed to regenerate QR code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyBinCode = () => {
    copyToClipboard(binCode);
    notifySuccess(`Bin code ${binCode} copied to clipboard`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
          {binCode}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          QR Code Preview
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        <Box
          sx={{
            display: 'inline-block',
            p: 2.5,
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1.5, fontWeight: 700, fontSize: '0.65rem', letterSpacing: 2, textTransform: 'uppercase' }}
          >
            PBLMS
          </Typography>
          {qrSrc ? (
            <Box
              component="img"
              src={qrSrc}
              alt={binCode}
              sx={{ width: 220, height: 220, display: 'block', mx: 'auto', imageRendering: 'pixelated' }}
            />
          ) : (
            <Box
              sx={{
                width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', border: '2px dashed', borderColor: 'warning.main', borderRadius: 2,
                bgcolor: '#FFF8E1',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <WarningAmberIcon sx={{ fontSize: 36, color: 'warning.main', mb: 1 }} />
                <Typography variant="caption" color="warning.dark" sx={{ display: 'block', fontWeight: 600 }}>
                  QR image missing
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                >
                  {regenerating ? 'Generating...' : 'Generate QR'}
                </Button>
              </Box>
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace', fontSize: '1.1rem' }}>
              {binCode}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {bin.Bin_Number || '\u2014'}
            </Typography>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Chip size="small" label={`Type: ${bin.Bin_Type_Name || '\u2014'}`} variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.65rem', height: 22 }} />
            <Chip size="small" label={`Category: ${bin.Bin_Category_Name || '\u2014'}`} variant="outlined" sx={{ mb: 0.5, fontSize: '0.65rem', height: 22 }} />
            {bin.Capacity != null && (
              <Chip size="small" label={`${bin.Capacity} ${bin.Capacity_Unit || ''}`} variant="outlined" sx={{ ml: 0.5, mb: 0.5, fontSize: '0.65rem', height: 22 }} />
            )}
          </Box>
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ justifyContent: 'center', gap: 1, px: 3, pb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload} size="small" disabled={!qrSrc}>
          Download
        </Button>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} size="small" disabled={!qrSrc}>
          Print
        </Button>
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyBinCode} size="small">
          Copy Code
        </Button>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RefreshIcon />}
          onClick={handleRegenerate}
          size="small"
          disabled={regenerating}
        >
          {regenerating ? 'Generating...' : 'Regenerate'}
        </Button>
        <Button variant="contained" startIcon={<CloseIcon />} onClick={onClose} size="small">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Bulk QR Generation Dialog ──────────────────────────────────────────────

function BulkQrDialog({ open, bins, onClose, onComplete }) {
  const { notifySuccess, notifyError } = useNotification();
  const [status, setStatus] = useState('idle'); // idle | running | done
  const [progress, setProgress] = useState({ total: 0, completed: 0, generated: 0, skipped: 0, failed: 0 });
  const [results, setResults] = useState([]);

  // Find bins needing QR generation: those with Bin_Code but no QR_Image
  const binsNeedingQr = bins.filter((b) => b.Bin_Code && !b.QR_Image);
  const countMissing = binsNeedingQr.length;

  const handleStart = async () => {
    setStatus('running');
    setProgress({ total: binsNeedingQr.length, completed: 0, generated: 0, skipped: 0, failed: 0 });
    setResults([]);

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const allResults = [];

    for (let i = 0; i < binsNeedingQr.length; i++) {
      const bin = binsNeedingQr[i];
      const binCode = bin.Bin_Code;
      try {
        const res = await binService.regenerateQr(bin.Bin_ID);
        const updated = res.data?.data;
        if (updated?.QR_Image) {
          generated++;
          allResults.push({ binCode, status: 'generated', qrImage: updated.QR_Image });
          if (onComplete) onComplete(bin.Bin_ID, updated);
        } else {
          skipped++;
          allResults.push({ binCode, status: 'skipped', reason: 'No image returned' });
        }
      } catch (e) {
        failed++;
        allResults.push({ binCode, status: 'failed', reason: e.response?.data?.error?.message || e.message });
      }
      setProgress({ total: binsNeedingQr.length, completed: i + 1, generated, skipped, failed });
      setResults([...allResults]);
    }

    setStatus('done');
    if (generated > 0) notifySuccess(`Generated ${generated} QR code${generated !== 1 ? 's' : ''}`);
    if (failed > 0) notifyError(`${failed} generation${failed !== 1 ? 's' : ''} failed`);
  };

  return (
    <Dialog open={open} onClose={status === 'running' ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <QrCodeIcon sx={{ fontSize: 24, color: 'primary.main' }} />
        Generate Missing QR Codes
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        {status === 'idle' && (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {countMissing === 0
                ? 'All bins have QR codes. No missing QR codes detected.'
                : `${countMissing} bin${countMissing !== 1 ? 's' : ''} found without QR code${countMissing !== 1 ? 's' : ''}.`}
            </Typography>
            {countMissing > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 200, overflowY: 'auto', mb: 2 }}>
                {binsNeedingQr.map((b) => (
                  <Chip
                    key={b.Bin_ID}
                    label={b.Bin_Code || b.Bin_Number}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5, fontSize: '0.65rem', height: 22 }}
                  />
                ))}
              </Paper>
            )}
          </Box>
        )}

        {status === 'running' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Generating QR codes...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress.completed} / {progress.total}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}
              sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip size="small" label={`Generated: ${progress.generated}`} color="success" variant="outlined" />
              <Chip size="small" label={`Skipped: ${progress.skipped}`} color="default" variant="outlined" />
              <Chip size="small" label={`Failed: ${progress.failed}`} color="error" variant="outlined" />
            </Box>
          </Box>
        )}

        {status === 'done' && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Generation complete
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Chip size="small" label={`Generated: ${progress.generated}`} color="success" />
              <Chip size="small" label={`Skipped: ${progress.skipped}`} color="default" />
              <Chip size="small" label={`Failed: ${progress.failed}`} color="error" />
            </Box>
            {progress.failed > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 150, overflowY: 'auto' }}>
                {results.filter((r) => r.status === 'failed').map((r, i) => (
                  <Typography key={i} variant="caption" color="error.main" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    {r.binCode}: {r.reason}
                  </Typography>
                ))}
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, pb: 1.5, gap: 1 }}>
        {status === 'idle' && countMissing > 0 && (
          <Button variant="contained" onClick={handleStart} startIcon={<QrCodeIcon />}>
            Generate {countMissing} QR Code{countMissing !== 1 ? 's' : ''}
          </Button>
        )}
        <Button onClick={onClose} disabled={status === 'running'} color="inherit">
          {status === 'done' ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── QR Thumbnail Component ──────────────────────────────────────────────────

function QrThumbnail({ bin, onClick }) {
  const [imgError, setImgError] = useState(false);
  const qrSrc = bin.QR_Image
    ? (bin.QR_Image.startsWith('http') ? bin.QR_Image : `${QR_BASE}${bin.QR_Image}`)
    : null;

  useEffect(() => {
    setImgError(false);
  }, [bin.QR_Image]);

  if (!qrSrc || imgError) {
    return (
      <Tooltip title={!bin.QR_Image ? 'No QR code generated' : 'QR image missing or broken — click to regenerate'}>
        <Box
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          sx={{
            width: 36, height: 36, borderRadius: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px dashed', borderColor: 'warning.main',
            bgcolor: '#FFF8E1', cursor: 'pointer',
            '&:hover': { bgcolor: '#FFF3CD', borderColor: 'warning.dark' },
          }}
          role="button"
          tabIndex={0}
          aria-label="Missing QR code — click to regenerate"
        >
          <QrCodeIcon sx={{ fontSize: 18, color: 'warning.main' }} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Click to preview QR code">
      <Box
        component="img"
        src={qrSrc}
        alt={`QR for ${bin.Bin_Code || bin.Bin_Number}`}
        onError={() => setImgError(true)}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        sx={{
          width: 36, height: 36, display: 'block', borderRadius: 1,
          border: '1px solid', borderColor: 'grey.200',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            transform: 'scale(2.5)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            zIndex: 100,
            position: 'relative',
            borderRadius: 2,
          },
        }}
        role="button"
        tabIndex={0}
        aria-label={`Preview QR code for ${bin.Bin_Code || bin.Bin_Number}`}
      />
    </Tooltip>
  );
}

// ─── Main BinMaster Component ────────────────────────────────────────────────

export default function BinMaster() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifySuccess, notifyFromApiError } = useNotification();

  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, bin: null });

  // QR dialog state
  const [previewBin, setPreviewBin] = useState(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const fetchBins = useCallback(async (searchTerm) => {
    try {
      const res = await binService.getBins(searchTerm ? { search: searchTerm } : {});
      setBins(res.data.data || []);
    } catch {
      setError('Failed to load bins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBins(search); }, [fetchBins, search]);

  const handleDeactivate = async () => {
    try {
      await binService.deactivateBin(deleteDialog.bin.Bin_ID);
      setDeleteDialog({ open: false, bin: null });
      fetchBins(search);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Deactivation failed');
      setDeleteDialog({ open: false, bin: null });
    }
  };

  const handleDownloadQr = async (e, bin) => {
    e.stopPropagation();
    if (!bin.QR_Image) {
      notifyFromApiError('No QR code available for this bin');
      return;
    }
    try {
      const qrSrc = getQrUrl(bin.QR_Image);
      const a = document.createElement('a');
      a.href = qrSrc;
      a.download = `${bin.Bin_Code || bin.Bin_Number}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notifySuccess(`QR code downloaded for ${bin.Bin_Code || bin.Bin_Number}`);
    } catch {
      notifyFromApiError('Failed to download QR code');
    }
  };

  const handlePrintQr = (e, bin) => {
    e.stopPropagation();
    if (!bin.QR_Image) {
      notifyFromApiError('No QR code available for this bin');
      return;
    }
    const qrSrc = getQrUrl(bin.QR_Image);
    const binCode = bin.Bin_Code || bin.Bin_Number;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>PBLMS — QR Label — ${binCode}</title>
      <style>
        @page { size: A6; margin: 8mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          display: flex; justify-content: center; align-items: center;
          min-height: 100vh; background: #fff;
        }
        .label {
          text-align: center; padding: 24px; max-width: 105mm;
          border: 2px dashed #D8E2EC; border-radius: 12px;
        }
        .logo {
          font-size: 18px; font-weight: 800; color: #0F4C81;
          letter-spacing: 3px; margin-bottom: 4px;
        }
        .subtitle {
          font-size: 9px; color: #607080; margin-bottom: 16px;
          text-transform: uppercase; letter-spacing: 2px;
        }
        .qr-wrapper {
          display: inline-block; padding: 12px;
          border: 1px solid #D8E2EC; border-radius: 8px;
          background: #fff;
        }
        img { width: 180px; height: 180px; display: block; }
        .code {
          font-size: 26px; font-weight: 700; margin-top: 12px;
          letter-spacing: 3px; color: #243447; font-family: 'Courier New', monospace;
        }
        .meta { margin-top: 12px; }
        .meta-row {
          display: flex; justify-content: space-between;
          font-size: 10px; color: #607080; padding: 3px 0;
          border-bottom: 1px dotted #E0E0E0;
        }
        .meta-row:last-child { border-bottom: none; }
        .meta-label { font-weight: 600; color: #243447; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .label { border: 2px dashed #D8E2EC; }
        }
      </style></head><body>
        <div class="label">
          <div class="logo">PBLMS</div>
          <div class="subtitle">Pharmaceutical Bin Lifecycle</div>
          <div class="qr-wrapper">
            <img src="${qrSrc}" alt="${binCode}" crossorigin="anonymous" />
          </div>
          <div class="code">${binCode}</div>
          <div class="meta">
            <div class="meta-row"><span class="meta-label">Bin Number</span><span>${bin.Bin_Number || '\u2014'}</span></div>
            <div class="meta-row"><span class="meta-label">Type</span><span>${bin.Bin_Type_Name || '\u2014'}</span></div>
            <div class="meta-row"><span class="meta-label">Category</span><span>${bin.Bin_Category_Name || '\u2014'}</span></div>
            ${bin.Capacity != null ? `<div class="meta-row"><span class="meta-label">Capacity</span><span>${bin.Capacity} ${bin.Capacity_Unit || ''}</span></div>` : ''}
          </div>
        </div>
        <script>window.onload=function(){window.print();window.close();};<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const handleRegenerateSingle = async (e, bin) => {
    e.stopPropagation();
    try {
      const res = await binService.regenerateQr(bin.Bin_ID);
      const updated = res.data?.data;
      if (updated?.QR_Image) {
        setBins((prev) =>
          prev.map((b) =>
            b.Bin_ID === bin.Bin_ID ? { ...b, QR_Image: updated.QR_Image, QR_Value: updated.QR_Value } : b,
          ),
        );
        notifySuccess(`QR code regenerated for ${bin.Bin_Code || bin.Bin_Number}`);
      }
    } catch (e) {
      notifyFromApiError(e.response?.data?.error || 'Failed to regenerate QR code');
    }
  };

  const handleBulkComplete = (binId, updated) => {
    if (updated?.QR_Image) {
      setBins((prev) =>
        prev.map((b) =>
          b.Bin_ID === binId ? { ...b, QR_Image: updated.QR_Image, QR_Value: updated.QR_Value } : b,
        ),
      );
    }
  };

  const handlePreviewClose = () => {
    setPreviewBin(null);
    // Refresh bins list to pick up any QR regenerations done in preview
    fetchBins(search);
  };

  const columns = [
    {
      key: 'Bin_Code',
      label: 'Bin Code',
      sortable: true,
      minWidth: 130,
      render: (r) => (
        <Box
          onClick={(e) => { e.stopPropagation(); setPreviewBin(r); }}
          sx={{
            cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600,
            fontSize: '0.8rem', color: 'primary.main',
            '&:hover': { textDecoration: 'underline', color: 'primary.dark' },
          }}
          role="button"
          tabIndex={0}
          aria-label={`Open QR preview for ${r.Bin_Code || r.Bin_Number}`}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setPreviewBin(r); } }}
        >
          {r.Bin_Code || r.Bin_Number || '\u2014'}
        </Box>
      ),
    },
    { key: 'Bin_Number', label: 'Bin Number', sortable: true, minWidth: 120 },
    { key: 'Bin_Type_Name', label: 'Type', minWidth: 120, render: (r) => r.Bin_Type_Name || '\u2014' },
    { key: 'Bin_Category_Name', label: 'Category', minWidth: 130, render: (r) => r.Bin_Category_Name || '\u2014' },
    {
      key: 'Current_Status',
      label: 'Status',
      sortable: true,
      minWidth: 160,
      render: (r) => <StatusChip status={r.Current_Status} />,
    },
    {
      key: 'Is_Active',
      label: 'Active',
      minWidth: 80,
      render: (r) => <StatusChip status={r.Is_Active ? 'Active' : 'Inactive'} type="user" />,
    },
    {
      key: 'qr_preview',
      label: 'QR',
      minWidth: 70,
      sx: { textAlign: 'center' },
      cellSx: { textAlign: 'center' },
      render: (r) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 40 }}>
          <QrThumbnail bin={r} onClick={() => setPreviewBin(r)} />
        </Box>
      ),
    },
    {
      key: 'qr_actions',
      label: 'QR Actions',
      minWidth: 130,
      cellSx: { textAlign: 'center' },
      render: (r) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={r.QR_Image ? 'Download QR' : 'No QR to download'}>
            <span>
              <IconButton
                size="small"
                disabled={!r.QR_Image}
                onClick={(e) => handleDownloadQr(e, r)}
                aria-label={`Download QR for ${r.Bin_Code || r.Bin_Number}`}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={r.QR_Image ? 'Print QR Label' : 'No QR to print'}>
            <span>
              <IconButton
                size="small"
                disabled={!r.QR_Image}
                onClick={(e) => handlePrintQr(e, r)}
                aria-label={`Print QR for ${r.Bin_Code || r.Bin_Number}`}
              >
                <PrintIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Regenerate QR">
            <IconButton
              size="small"
              disabled={!r.Bin_Code}
              onClick={(e) => handleRegenerateSingle(e, r)}
              aria-label={`Regenerate QR for ${r.Bin_Code || r.Bin_Number}`}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      minWidth: 140,
      sx: { textAlign: 'right' },
      cellSx: { textAlign: 'right' },
      render: (r) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => navigate(`/admin/bins/${r.Bin_ID}`)} aria-label={`View details for ${r.Bin_Number}`}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {r.Current_Status === 'Awaiting_Loading' && (
            <Tooltip title="Edit Bin">
              <IconButton size="small" onClick={() => navigate(`/admin/bins/${r.Bin_ID}/edit`)} aria-label={`Edit ${r.Bin_Number}`}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {r.Is_Active === 1 && r.Current_Status === 'Awaiting_Loading' && (
            <Tooltip title="Deactivate Bin">
              <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, bin: r })} aria-label={`Deactivate ${r.Bin_Number}`}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // Debounced search
  const searchTimeout = useRef(null);
  const handleSearchChange = (val) => {
    clearTimeout(searchTimeout.current);
    setLoading(true);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  };

  // Count bins with missing QR codes
  const missingQrCount = bins.filter((b) => b.Bin_Code && !b.QR_Image).length;

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader
          title="Bin Master"
          actionLabel="Register Bin"
          onAction={() => navigate('/admin/bins/create')}
          subtitle="Manage all pharmaceutical bins in the system"
        >
          {/* Bulk QR generation action */}
          {missingQrCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<QrCodeIcon />}
              onClick={() => setBulkDialogOpen(true)}
              sx={{ fontSize: '0.72rem', minHeight: 32 }}
            >
              Generate Missing QR ({missingQrCount})
            </Button>
          )}
        </PageHeader>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search by Bin Code or Bin Number..."
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5, maxWidth: 320 }}
        />

        {/* Data table or loading/empty states */}
        {loading ? (
          <LoadingSpinner />
        ) : bins.length === 0 ? (
          <EmptyState
            icon={<Inventory2Icon sx={{ fontSize: 48 }} />}
            title="No bins found"
            message={search ? 'No bins match your search. Try a different term.' : 'Create the first bin to start tracking pharmaceutical inventory.'}
            actionLabel="Register Bin"
            onAction={() => navigate('/admin/bins/create')}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={bins}
            keyField="Bin_ID"
            onRowClick={(r) => navigate(`/admin/bins/${r.Bin_ID}`)}
          />
        )}

        {/* QR Preview Dialog */}
        <QrPreviewDialog
          open={Boolean(previewBin)}
          bin={previewBin}
          onClose={handlePreviewClose}
          onRegenerate={(binId, updated) => {
            if (updated?.QR_Image) {
              setBins((prev) =>
                prev.map((b) =>
                  b.Bin_ID === binId ? { ...b, QR_Image: updated.QR_Image, QR_Value: updated.QR_Value } : b,
                ),
              );
              // Update the preview bin as well
              setPreviewBin((prev) =>
                prev?.Bin_ID === binId ? { ...prev, QR_Image: updated.QR_Image, QR_Value: updated.QR_Value } : prev,
              );
            }
          }}
        />

        {/* Bulk QR Generation Dialog */}
        <BulkQrDialog
          open={bulkDialogOpen}
          bins={bins}
          onClose={() => setBulkDialogOpen(false)}
          onComplete={handleBulkComplete}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialog.open}
          title="Deactivate Bin"
          message={`Are you sure you want to deactivate ${deleteDialog.bin?.Bin_Number || 'this bin'}? This action cannot be undone while the bin is in use.`}
          severity="warning"
          confirmLabel="Deactivate"
          onConfirm={handleDeactivate}
          onCancel={() => setDeleteDialog({ open: false, bin: null })}
        />
      </Box>
    </PortalLayout>
  );
}