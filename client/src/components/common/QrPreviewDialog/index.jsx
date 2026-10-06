import { useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function QrPreviewDialog({ open, bin, onClose }) {
  const printRef = useRef(null);

  if (!bin) return null;

  const binCode = bin.Bin_Code || bin.binCode;
  const qrImage = bin.QR_Image || bin.qrImage;
  const qrSrc = qrImage?.startsWith('http') ? qrImage : `${window.location.origin}${qrImage}`;

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>QR Label - ${binCode}</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif; }
        .label { text-align: center; padding: 20px; }
        .logo { font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #555; }
        .code { font-size: 24px; font-weight: bold; margin: 12px 0; letter-spacing: 2px; }
        .name { font-size: 14px; color: #777; margin-top: 4px; }
        img { width: 280px; height: 280px; }
        @media print { @page { margin: 0; } body { margin: 0; } }
      </style></head><body>
        <div class="label">
          <div class="logo">PBLMS</div>
          <img src="${qrSrc}" alt="${binCode}" crossorigin="anonymous" />
          <div class="code">${binCode}</div>
          ${bin.Bin_Number ? `<div class="name">${bin.Bin_Number}</div>` : ''}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body></html>
    `);
    printWin.document.close();
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `${binCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        Bin Created Successfully
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        <Box
          ref={printRef}
          sx={{
            display: 'inline-block',
            p: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            bgcolor: 'white',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
            PBLMS
          </Typography>
          {qrSrc && (
            <Box
              component="img"
              src={qrSrc}
              alt={binCode}
              sx={{ width: 200, height: 200, display: 'block', mx: 'auto' }}
            />
          )}
          <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 700, letterSpacing: 2 }}>
            {binCode}
          </Typography>
          {bin.Bin_Number && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {bin.Bin_Number}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ justifyContent: 'center', gap: 1, px: 3, pb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          size="medium"
        >
          Download QR
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          size="medium"
        >
          Print QR
        </Button>
        <Button
          variant="contained"
          startIcon={<CloseIcon />}
          onClick={onClose}
          size="medium"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
