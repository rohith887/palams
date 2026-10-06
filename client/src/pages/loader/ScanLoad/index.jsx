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
import masterService from '../../../services/masterService';

export default function ScanLoad() {
  const { user, logout } = useAuth();
  const workflow = useOperatorWorkflow({ operationLabel: 'Scan & Load', role: 'Loader', expectedStatuses: 'Awaiting_Loading' });
  const [bays, setBays] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ bayId: '', tankId: '', materialId: '', comments: '' });
  const uf = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const valid = form.bayId && form.tankId && form.materialId;

  useEffect(() => {
    masterService.getBays().then(r => setBays(r.data.data || [])).catch(() => {});
    masterService.getMaterials().then(r => setMaterials(r.data.data || [])).catch(() => {});
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
      fromStatus: 'Awaiting_Loading', toStatus: 'Loading_In_Progress', operationType: 'START_LOADING',
    });
    const r = await axiosInstance.get(`/v1/bins/${bd.Bin_ID}`);
    const f = r.data?.data; if (f) { bd.Row_Version = f.Row_Version; }
  });

  const handleComplete = useCallback(() => workflow.handleComplete(async (bd) => {
    await axiosInstance.post('/v1/loading/complete', {
      binId: bd.Bin_ID, bayId: +form.bayId, tankId: +form.tankId, materialId: +form.materialId,
      rowVersion: bd.Row_Version, comments: form.comments || undefined,
    });
  }), [form, workflow]);

  const doReset = () => {
    workflow.doReset();
    setForm({ bayId: '', tankId: '', materialId: '', comments: '' });
  };

  const { step, binData, error, formError, isLoading, workflowResult, completing, starting, offline, recovering, recoveryBanner, retryError, retryLastOperation, handleScan, handleContinue } = workflow;

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <OperationHeader title="Scan & Load" role="Loader" />
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
            role="Loader"
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
              {starting ? 'Starting...' : 'Start Loading'}
            </Button>
            <Button variant="outlined" fullWidth size="small" onClick={doReset} disabled={starting || completing} sx={{ mt: 1 }}>
              Cancel
            </Button>
          </BinContextCard>
        )}
        {step === S.STARTED && (
          <Paper sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>Loading in progress — Bin {binData?.Bin_Number}</Alert>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleComplete(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Bay" select value={form.bayId} onChange={uf('bayId')} required size="small">
                {bays.map(b => <MenuItem key={b.Bay_ID} value={b.Bay_ID}>{b.Bay_Name}</MenuItem>)}
              </TextField>
              <TextField label="Tank" select value={form.tankId} onChange={uf('tankId')} required size="small" disabled={!form.bayId}>
                {tanks.map(t => <MenuItem key={t.Tank_ID} value={t.Tank_ID}>{t.Tank_Name}</MenuItem>)}
              </TextField>
              <TextField label="Material" select value={form.materialId} onChange={uf('materialId')} required size="small">
                {materials.map(m => <MenuItem key={m.Material_ID} value={m.Material_ID}>{m.Material_Name}</MenuItem>)}
              </TextField>
              <TextField label="Comments" value={form.comments} onChange={uf('comments')} size="small" multiline rows={2} inputProps={{ maxLength: 500 }} />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={!valid || completing} sx={{ minHeight: 56 }}>
                {completing ? 'Completing...' : 'Complete Loading'}
              </Button>
              <Button variant="outlined" fullWidth size="small" onClick={workflow.cancelWorkflow} disabled={completing} sx={{ color: 'error.main', borderColor: 'error.main' }}>
                Cancel Workflow
              </Button>
            </Box>
          </Paper>
        )}
        {step === S.DONE && binData && (
          <ScanSuccess
            title="Loading Complete"
            binNumber={binData.Bin_Number}
            message="Bin is now awaiting unloading."
            details={[
              { label: 'Material', value: form.materialId ? materials.find(m => m.Material_ID === +form.materialId)?.Material_Name || form.materialId : '—' },
              { label: 'Bay', value: form.bayId ? bays.find(b => b.Bay_ID === +form.bayId)?.Bay_Name || form.bayId : '—' },
              { label: 'Tank', value: form.tankId ? tanks.find(t => t.Tank_ID === +form.tankId)?.Tank_Name || form.tankId : '—' },
              { label: 'Next Stage', value: 'Awaiting Unloading' },
            ]}
            onNext={doReset}
          />
        )}
        {step === S.COMPLETING && <LoadingSpinner fullScreen message="Completing loading..." />}
        </>
        )}
      </Box>
    </PortalLayout>
  );
}
