import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Button, Alert, Chip, TextField,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
} from '@mui/material';
import PortalLayout from '../../../components/layout/PortalLayout';
import PageHeader from '../../../components/common/PageHeader';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import useAuth from '../../../hooks/useAuth';
import binService from '../../../services/binService';
import qaService from '../../../services/qaService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

const CHECKLIST_ITEMS = ['visual','residue','damage','odor','label','seal'];
const CHECKLIST_LABELS = {
  visual: 'Visual Inspection', residue: 'Residue Check',
  damage: 'Damage Assessment', odor: 'Odor Check',
  label: 'Label Integrity', seal: 'Seal Integrity',
};

export default function Inspection() {
  const { user, logout } = useAuth();
  const { binId } = useParams();
  const [binNumber, setBinNumber] = useState('');
  const [binData, setBinData] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [checklist, setChecklist] = useState(
    Object.fromEntries(CHECKLIST_ITEMS.map(k => [k, 'Pass']))
  );
  const [notes, setNotes] = useState(
    Object.fromEntries(CHECKLIST_ITEMS.map(k => [k, '']))
  );
  const [overallResult, setOverallResult] = useState('PASS');
  const [failureReason, setFailureReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  useEffect(() => {
    if (!binId) return;
    const loadBinById = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await binService.getBins();
        const bins = res.data.data || [];
        const found = bins.find(b => String(b.Bin_ID) === String(binId));
        if (!found) { setError('Bin not found'); return; }
        setBinData(found);
      } catch { setError('Failed to load bin'); } finally { setLoading(false); }
    };
    loadBinById();
  }, [binId]);

  const handleSearchBin = async () => {
    if (!binNumber.trim()) return;
    setError(''); setBinData(null); setCtx(null);
    setLoading(true);
    try {
      const res = await binService.getBins();
      const bins = res.data.data || [];
      const found = bins.find(b => b.Bin_Number?.toLowerCase() === binNumber.trim().toLowerCase());
      if (!found) { setError('Bin not found'); return; }
      setBinData(found);
    } catch { setError('Failed to load bin'); } finally { setLoading(false); }
  };

  const handleStartQA = async () => {
    setConfirmStart(false); setError(''); setLoading(true);
    try {
      const res = await qaService.startQA({ binId: binData.Bin_ID, rowVersion: binData.Row_Version });
      setCtx(res.data.data);
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to start QA'); } finally { setLoading(false); }
  };

  const handleCompleteQA = async () => {
    if (overallResult === 'FAIL' && failureReason.length < 20) {
      setError('Failure reason must be at least 20 characters'); return;
    }
    setConfirmComplete(false); setError(''); setLoading(true);
    try {
      const payload = {
        binId: binData.Bin_ID, rowVersion: binData.Row_Version, overallResult, failureReason: overallResult === 'FAIL' ? failureReason : null,
        ...Object.fromEntries(CHECKLIST_ITEMS.map(k => [k, checklist[k]])),
        ...Object.fromEntries(CHECKLIST_ITEMS.map(k => [`${k}Notes`, notes[k] || null])),
      };
      const res = await qaService.completeQA(payload);
      setSuccess(`QA ${overallResult === 'PASS' ? 'Passed' : 'Failed'}! Next status: ${STATUS_LABELS[res.data.data.finalStatus] || res.data.data.finalStatus}`);
      setCtx(null); setBinData(null); setBinNumber('');
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to complete QA'); } finally { setLoading(false); }
  };

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="QA Inspection" subtitle="Perform quality assurance inspections" />
        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {!binId && (
          <Paper sx={{ p: 1.5, mb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="Bin Number" value={binNumber} onChange={e => setBinNumber(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSearchBin()} sx={{ minWidth: 200 }} />
              <Button variant="contained" onClick={handleSearchBin} disabled={loading} size="small">Search</Button>
            </Box>
          </Paper>
        )}

        {loading && <LoadingSpinner />}

        {ctx && ctx.requiresQaAttention && (
          <Alert severity="error" sx={{ mb: 1.5, fontWeight: 600, py: 0.5, fontSize: '0.8125rem' }}>REQUIRES QA ATTENTION — Abnormal unloading condition detected</Alert>
        )}
        {ctx && ctx.isReinspection && (
          <Alert severity="warning" sx={{ mb: 1.5, fontWeight: 600, py: 0.5, fontSize: '0.8125rem' }}>REINSPECTION — This is a re-inspection cycle</Alert>
        )}

        {binData && !ctx && ['Awaiting_QA','Awaiting_Reinspection'].includes(binData.Current_Status) && (
          <Paper sx={{ p: 1.5, mb: 1.5 }}>
            <Typography variant="h3" sx={{ fontSize: '0.9375rem' }}>Bin: {binData.Bin_Number}</Typography>
            <Chip label={STATUS_LABELS[binData.Current_Status]} color={binData.Current_Status==='Awaiting_Reinspection'?'warning':'primary'} size="small" sx={{ mt: 0.5 }} />
            <Box sx={{ mt: 1 }}><Button variant="contained" onClick={() => setConfirmStart(true)} disabled={loading} size="small">Start QA</Button></Box>
          </Paper>
        )}

        {ctx && (
          <Paper sx={{ p: 1.5, mb: 1.5 }}>
            <Typography variant="h3" sx={{ fontSize: '0.9375rem' }}>QA Inspection Form</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid item xs={6} sm={4}><Typography variant="caption">Material</Typography><Typography>{ctx.materialName || '—'}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption">Batch</Typography><Typography>{ctx.batchNumber || '—'}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption">Cleaning</Typography><Typography>{ctx.cleaningMethod} / {ctx.cleaningAgent}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption">Temp / Cycles</Typography><Typography>{ctx.waterTemp}°C / {ctx.rinseCycles}</Typography></Grid>
            </Grid>

            <Box sx={{ mt: 1.5 }}>
              {CHECKLIST_ITEMS.map(key => (
                <Paper key={key} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{CHECKLIST_LABELS[key]}</FormLabel>
                    <RadioGroup row value={checklist[key]} onChange={e => setChecklist({...checklist, [key]: e.target.value})}>
                      <FormControlLabel value="Pass" control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 18 } }} />} label="Pass" componentsProps={{ typography: { fontSize: '0.8125rem' } }} />
                      <FormControlLabel value="Fail" control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 18 } }} />} label="Fail" componentsProps={{ typography: { fontSize: '0.8125rem' } }} />
                    </RadioGroup>
                    <TextField
                      fullWidth size="small" label="Notes (optional)" multiline rows={1}
                      value={notes[key]} onChange={e => setNotes({...notes, [key]: e.target.value})}
                      inputProps={{ maxLength: 500 }}
                      sx={{ mt: 0.5 }}
                    />
                  </FormControl>
                </Paper>
              ))}
            </Box>

            <Box sx={{ mt: 1.5, mb: 1.5 }}>
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>Overall Result</FormLabel>
                <RadioGroup row value={overallResult} onChange={e => setOverallResult(e.target.value)}>
                  <FormControlLabel value="PASS" control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 18 } }} />} label="PASS" componentsProps={{ typography: { fontSize: '0.8125rem' } }} />
                  <FormControlLabel value="FAIL" control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 18 } }} />} label="FAIL" componentsProps={{ typography: { fontSize: '0.8125rem' } }} />
                </RadioGroup>
              </FormControl>
              {overallResult === 'FAIL' && (
                <TextField
                  fullWidth size="small" label="Failure Reason (minimum 20 characters)" multiline rows={2}
                  value={failureReason} onChange={e => setFailureReason(e.target.value)}
                  required error={failureReason.length > 0 && failureReason.length < 20}
                  helperText={failureReason.length > 0 && failureReason.length < 20 ? `${failureReason.length}/20 characters minimum` : `${failureReason.length} characters`}
                  inputProps={{ maxLength: 1000 }}
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>

            <Button variant="contained" onClick={() => setConfirmComplete(true)} disabled={loading || (overallResult==='FAIL' && failureReason.length<20)} sx={{ minHeight: 40 }}>
              Complete QA
            </Button>
          </Paper>
        )}

        <ConfirmationDialog open={confirmStart} title="Start QA" message={`Start QA inspection for bin ${binData?.Bin_Number}?`} severity="info" confirmLabel="Start" onConfirm={handleStartQA} onCancel={() => setConfirmStart(false)} loading={loading} />
        <ConfirmationDialog open={confirmComplete} title="Complete QA" message={`Submit QA result: ${overallResult}?`} severity={overallResult==='FAIL'?'warning':'info'} confirmLabel="Submit" onConfirm={handleCompleteQA} onCancel={() => setConfirmComplete(false)} loading={loading} />
      </Box>
    </PortalLayout>
  );
}