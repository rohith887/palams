import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Button, TextField, MenuItem, Alert, LinearProgress, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import PortalLayout from '../../../components/layout/PortalLayout';
import QRScanner from '../../../components/common/QRScanner';
import BinContextCard from '../../../components/common/BinContextCard';
import ScanConfirm from '../../../components/common/ScanConfirm';
import ScanError from '../../../components/common/ScanError';
import ScanSuccess from '../../../components/common/ScanSuccess';
import WorkflowStatusCard from '../../../components/common/WorkflowStatusCard';
import OperationHeader from '../../../components/common/OperationHeader';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import useAuth from '../../../hooks/useAuth';
import useOperatorWorkflow, { S } from '../../../hooks/useOperatorWorkflow';
import axiosInstance from '../../../utils/axiosInstance';
import unloadingService from '../../../services/unloadingService';
import masterService from '../../../services/masterService';

export default function ScanUnload() {
  const { user, logout } = useAuth();
  const workflow = useOperatorWorkflow({ operationLabel: 'Scan & Unload', role: 'Unloader', expectedStatuses: 'Awaiting_Unloading' });
  const [bays, setBays] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [form, setForm] = useState({ loadingId: '', bayId: '', tankId: '', comments: '' });
  const uf = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    masterService.getBays().then(r => setBays(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.bayId) {
      masterService.getTanks(form.bayId).then(r => setTanks(r.data.data || [])).catch(() => {});
      setForm(p => ({ ...p, tankId: '' }));
    } else {
      setTanks([]);
    }
  }, [form.bayId]);

  const handleStart = () => workflow.handleStart(async (bd) => {
    await axiosInstance.post('/v1/workflow/start', {
      binId: bd.Bin_ID, rowVersion: bd.Row_Version,
      fromStatus: 'Awaiting_Unloading', toStatus: 'Unloading_In_Progress',
      operationType: 'START_UNLOADING',
    });
    const r = await axiosInstance.get(`/v1/bins/${bd.Bin_ID}`);
    const f = r.data?.data; if (f) { Object.assign(bd, f); }
    setForm((p) => ({ ...p, loadingId: bd.Loading_ID || '' }));
  });

  const handleComplete = useCallback(() => workflow.handleComplete(async (bd) => {
    await unloadingService.completeUnloading({
      binId: bd.Bin_ID, loadingId: +form.loadingId || +bd.Loading_ID,
      unloadingCondition: 'Normal', rowVersion: bd.Row_Version,
      comments: form.comments || undefined,
    });
  }), [form, workflow]);

  const doReset = () => {
    workflow.doReset();
    setForm({ loadingId: '', bayId: '', tankId: '', comments: '' });
  };

  const { step, binData, error, formError, isLoading, workflowResult, completing, starting, offline, recovering, recoveryBanner, retryError, retryLastOperation, handleScan, handleContinue } = workflow;

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <OperationHeader title="Scan & Unload" role="Unloader" />
        {recovering && <LoadingSpinner message="Restoring previous workflow..." />}
        {!recovering && (
        <>
        {offline && <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8125rem' }}>No network connection. Waiting to reconnect...</Alert>}
        {recoveryBanner && (
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }} icon={<ReplayIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{recoveryBanner.title}</Typography>
            <Typography variant="caption">{recoveryBanner.message}</Typography>
          </Alert>
        )}
        {(error || formError) && <ScanError error={error || formError} onDismiss={doReset} />}
        {retryError && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8125rem' }}
            action={<Button color="inherit" size="small" onClick={retryLastOperation}>Retry</Button>}
          >
            {retryError.message}
          </Alert>
        )}
        {step > S.IDLE && step < S.DONE && step !== S.WORKFLOW_ISSUE && <LinearProgress sx={{ mb: 2 }} />}

        {step === S.WORKFLOW_ISSUE && workflowResult && (
          <WorkflowStatusCard
            workflow={workflowResult}
            role="Unloader"
            binLabel={binData?.Bin_Number}
            onScanAnother={doReset}
          />
        )}

        {(step === S.IDLE || step === S.SCANNING) && (
          step === S.SCANNING ? <LoadingSpinner message="Validating bin..." /> : <QRScanner onScan={handleScan} isScanning={step === S.IDLE} />
        )}
        {step === S.CONFIRMED && binData && (
          <ScanConfirm bin={binData} onContinue={handleContinue} />
        )}
        {step === S.CONTEXT && binData && (
          <BinContextCard bin={binData}>
            <Button variant="contained" fullWidth size="large" onClick={handleStart} disabled={starting || completing} sx={{ mt: 2, minHeight: 56 }}>
              {starting ? 'Starting...' : 'Start Unloading'}
            </Button>
            <Button variant="outlined" fullWidth size="small" onClick={doReset} disabled={starting || completing} sx={{ mt: 1 }}>
              Cancel
            </Button>
          </BinContextCard>
        )}
        {step === S.STARTED && (
          <Paper sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>Unloading in progress — Bin {binData?.Bin_Number}</Alert>
            {binData?.Loading_ID && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Box><strong>Material:</strong> {binData.Loading_Material_Name || '—'}</Box>
                  <Box><strong>Batch:</strong> {binData.Batch_Number || '—'}</Box>
                  <Box><strong>Qty Loaded:</strong> {binData.Quantity_Loaded} {binData.Unit_Of_Measure || ''}</Box>
                  <Box><strong>Loaded By:</strong> {binData.Loaded_By_Name || '—'}</Box>
                  <Box><strong>Loaded At:</strong> {binData.Loading_Start_At?.split('T')[0] || binData.Loading_Start_At?.split(' ')[0] || '—'}</Box>
                </Box>
              </Paper>
            )}
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleComplete(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Bay" select value={form.bayId} onChange={uf('bayId')} size="small">
                <MenuItem value=""><em>None</em></MenuItem>
                {bays.map(b => <MenuItem key={b.Bay_ID} value={b.Bay_ID}>{b.Bay_Name}</MenuItem>)}
              </TextField>
              <TextField label="Tank" select value={form.tankId} onChange={uf('tankId')} size="small" disabled={!form.bayId}>
                <MenuItem value=""><em>None</em></MenuItem>
                {tanks.map(t => <MenuItem key={t.Tank_ID} value={t.Tank_ID}>{t.Tank_Name}</MenuItem>)}
              </TextField>
              <TextField label="Comments" value={form.comments} onChange={uf('comments')} size="small" multiline rows={2} inputProps={{ maxLength: 500 }} />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={completing} sx={{ minHeight: 56 }}>
                {completing ? 'Completing...' : 'Complete Unloading'}
              </Button>
              <Button variant="outlined" fullWidth size="small" onClick={workflow.cancelWorkflow} disabled={completing} sx={{ color: 'error.main', borderColor: 'error.main', mt: 1 }}>
                Cancel Workflow
              </Button>
            </Box>
          </Paper>
        )}
        {step === S.DONE && binData && (
          <ScanSuccess
            title="Unloading Complete"
            binNumber={binData.Bin_Number}
            message="Bin is now awaiting cleaning."
            details={[
              { label: 'Material', value: binData.Loading_Material_Name || '—' },
              { label: 'Batch', value: binData.Batch_Number || '—' },
              { label: 'Next Stage', value: 'Awaiting Cleaning' },
            ]}
            onNext={doReset}
          />
        )}
        {step === S.COMPLETING && <LoadingSpinner fullScreen message="Completing unloading..." />}
        </>
        )}
      </Box>
    </PortalLayout>
  );
}
