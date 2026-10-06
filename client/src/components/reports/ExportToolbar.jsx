import { Box, Button, Tooltip } from '@mui/material';
import { Download as DownloadIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';

export default function ExportToolbar({ onExcel, onPdf, disabled, excelLabel = 'Excel', pdfLabel = 'PDF' }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75 }}>
      <Tooltip title="Export to Excel (.xlsx)">
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={onExcel}
            disabled={disabled}
          >
            {excelLabel}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Export to PDF">
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PdfIcon />}
            onClick={onPdf}
            disabled={disabled}
          >
            {pdfLabel}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}
