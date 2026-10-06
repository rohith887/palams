import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Alert, Chip, TextField, MenuItem,
} from '@mui/material';
import PortalLayout from '../../../components/layout/PortalLayout';
import PageHeader from '../../../components/common/PageHeader';
import FormField from '../../../components/common/FormField';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import useAuth from '../../../hooks/useAuth';
import binService from '../../../services/binService';
import masterService from '../../../services/masterService';
import loadingService from '../../../services/loadingService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

export default function LoadingPage() {
  const { user, logout } = useAuth();
  const [binNumber, setBinNumber] = useState('');
  const [binData, setBinData] = useState(null);
  const [bays, setBays] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({
    bayId: '', tankId: '', materialId: '', quantityLoaded: '',
    unitOfMeasure: '', batchNumber: '', expectedUnloadingDate: '', comments: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load dropdowns
  useEffect(() => {
    (async () => {
      try { const r = await masterService.getBays(); setBays(r.data.data || []); } catch {}
      try { const r = await masterService.getMaterials(); setMaterials(r.data.data || []); } catch {}
    })();
  }, []);

  const handleSearchBin = useCallback(async () => {
    if (!binNumber.trim()) return;
    setError(''); setBinData(null);
    setLoading(true);
    try {
      const res = await binService.getBins();
      const bins = res.data.data || [];
      const found = bins.find(b => b.Bin_Number?.toLowerCase() === binNumber.trim().toLowerCase());
      if (!found) { setError(`Bin "${binNumber.trim()}" not found`); return; }
      setBinData(found);
      if (bays.length) {
        const bayTanks = await masterService.getTanks(found.Current_Bay_ID);
        setTanks(bayTanks.data.data || []);
      }
    } catch (e) {
      setError('Failed to load bin data');
    } finally { setLoading(false); }
  }, [binNumber, bays]);

  const handleBayChange = useCallback(async (bayId) => {
    setForm(f => ({ ...f, bayId, tankId: '' }));
    if (bayId) {
      try { const r = await masterService.getTanks(Number(bayId)); setTanks(r.data.data || []); } catch { setTanks([]); }
    } else { setTanks([]); }
  }, []);

  const handleSubmit = useCallback(() => {
    setConfirmOpen(true);
  }, [form, binData]);

  const handleConfirmSubmit = useCallback(async () => {
    setConfirmOpen(false); setError(''); setSuccess('');
    setLoading(true);
    try {
      await loadingService.completeLoading({
        binId: binData.Bin_ID,
        bayId: Number(form.bayId),
        tankId: Number(form.tankId),
        materialId: Number(form.materialId),
        quantityLoaded: Number(form.quantityLoaded),
        unitOfMeasure: form.unitOfMeasure,
        batchNumber: form.batchNumber,
        expectedUnloadingDate: form.expectedUnloadingDate,
        rowVersion: binData.Row_Version,
        comments: form.comments || null,
      });
      setSuccess('Loading completed successfully!');
      setBinData(null);
      setBinNumber('');
      setForm({ bayId: '', tankId: '', materialId: '', quantityLoaded: '', unitOfMeasure: '', batchNumber: '', expectedUnloadingDate: '', comments: '' });
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Loading operation failed');
    } finally { setLoading(false); }
  }, [form, binData]);

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Scan & Load" subtitle="Load bins with materials" />
        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Bin Search */}
        <Paper sx={{ p: 1.5, mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField label="Bin Number" value={binNumber} onChange={e => setBinNumber(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchBin()} sx={{ minWidth: 200 }} />
            <Button variant="contained" onClick={handleSearchBin} disabled={loading} size="small">Search</Button>
          </Box>
        </Paper>

        {loading && <LoadingSpinner />}

        {/* Bin Summary */}
        {binData && (
          <Paper sx={{ p: 1.5, mb: 1.5 }}>
            <Typography variant="h3" sx={{ fontSize: '0.9375rem' }}>Bin: {binData.Bin_Number}</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid item xs={6} sm={3}><Typography variant="caption">Status</Typography><Chip label={STATUS_LABELS[binData.Current_Status] || binData.Current_Status} size="small" sx={{ display: 'block', mt: 0.25 }} /></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption">Type</Typography><Typography sx={{ fontSize: '0.8125rem' }}>{binData.Bin_Type_Name || '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption">Category</Typography><Typography sx={{ fontSize: '0.8125rem' }}>{binData.Bin_Category_Name || '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption">Capacity</Typography><Typography sx={{ fontSize: '0.8125rem' }}>{binData.Capacity} {binData.Capacity_Unit}</Typography></Grid>
            </Grid>
          </Paper>
        )}

        {/* Loading Form — only show if bin is Awaiting_Loading */}
        {binData && binData.Current_Status === 'Awaiting_Loading' && (
          <Paper sx={{ p: 1.5 }}>
            <Typography variant="h3" sx={{ fontSize: '0.9375rem' }}>Loading Form</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <FormField name="bayId" label="Bay" type="select" required value={form.bayId} onChange={e => handleBayChange(e.target.value)} options={bays.map(b => ({ value: b.Bay_ID, label: `${b.Bay_Code} — ${b.Bay_Name}` }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField name="tankId" label="Tank" type="select" required value={form.tankId} onChange={e => setForm({ ...form, tankId: e.target.value })} options={tanks.map(t => ({ value: t.Tank_ID, label: `${t.Tank_Code} — ${t.Tank_Name}` }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField name="materialId" label="Material" type="select" required value={form.materialId} onChange={e => setForm({ ...form, materialId: e.target.value })} options={materials.map(m => ({ value: m.Material_ID, label: `${m.Material_Code} — ${m.Material_Name}` }))} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormField name="quantityLoaded" label="Quantity" type="number" required value={form.quantityLoaded} onChange={e => setForm({ ...form, quantityLoaded: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormField name="unitOfMeasure" label="Unit" type="select" required value={form.unitOfMeasure} onChange={e => setForm({ ...form, unitOfMeasure: e.target.value })} options={[{ value: 'kg', label: 'kg' }, { value: 'L', label: 'L' }, { value: 'g', label: 'g' }]} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField name="batchNumber" label="Batch Number" required value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Expected Unloading Date" type="date" value={form.expectedUnloadingDate} onChange={e => setForm({ ...form, expectedUnloadingDate: e.target.value })} required fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <FormField name="comments" label="Comments" multiline maxLength={500} value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button variant="contained" onClick={handleSubmit} disabled={!form.bayId || !form.tankId || !form.materialId || !form.quantityLoaded || !form.expectedUnloadingDate || !form.batchNumber || loading} sx={{ minHeight: 40 }}>
                    Complete Loading
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => { setBinData(null); setBinNumber(''); setForm({ bayId: '', tankId: '', materialId: '', quantityLoaded: '', unitOfMeasure: '', batchNumber: '', expectedUnloadingDate: '', comments: '' }); setError(''); }}>Clear</Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {binData && binData.Current_Status !== 'Awaiting_Loading' && (
          <Alert severity="info" sx={{ py: 0.5, fontSize: '0.8125rem' }}>This bin is not in Awaiting Loading status. Current status: {STATUS_LABELS[binData.Current_Status] || binData.Current_Status}</Alert>
        )}

        <ConfirmationDialog
          open={confirmOpen}
          title="Complete Loading"
          message={`Confirm loading of ${form.quantityLoaded} ${form.unitOfMeasure} into bin ${binData?.Bin_Number}?`}
          severity="info"
          confirmLabel="Complete Loading"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setConfirmOpen(false)}
          loading={loading}
        />
      </Box>
    </PortalLayout>
  );
}