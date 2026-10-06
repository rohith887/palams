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
import cleaningService from '../../../services/cleaningService';
import masterService from '../../../services/masterService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

export default function ScanClean() {
  const { user, logout } = useAuth();
  const workflow = useOperatorWorkflow({ operationLabel: 'Scan & Clean', role: 'Cleaner', expectedStatuses: ['Awaiting_Cleaning', 'Reinspection_Cleaning'] });
  const [nextStatus, setNextStatus] = useState(null);
  const [bays, setBays] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [form, setForm] = useState({ bayId: '', tankId: '', comments: '' });
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
    await cleaningService.startCleaning({ binId: bd.Bin_ID, rowVersion: bd.Row_Version });
    const r = await axiosInstance.get(`/v1/bins/${bd.Bin_ID}`);
    const f = r.data?.data; if (f) { Object.assign(bd, f); }
  });

  const handleComplete = useCallback(() => workflow.handleComplete(async (bd) => {
    const res = await cleaningService.completeCleaning({
      binId: bd.Bin_ID, rowVersion: bd.Row_Version,
      comments: form.comments || undefined,
    });
    setNextStatus(res.data?.data?.nextStatus || 'Awaiting_QA');
  }), [form, workflow]);

  const doReset = () => {
    workflow.doReset();
    setNextStatus(null);
    setForm({ bayId: '', tankId: '', comments: '' });
  };

  const { step, binData, error, formError, isLoading, workflowResult, completing, starting, offline, recovering, recoveryBanner, retryError, retryLastOperation, handleScan, handleContinue } = workflow;

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <OperationHeader title="Scan & Clean" role="Cleaner" />
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
            role="Cleaner"
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
            {binData?.Current_Status === 'Reinspection_Cleaning' && (
              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8125rem', py: 0.5 }}>Reinspection Cleaning — Prior QA failure</Alert>
            )}
            <Button variant="contained" fullWidth size="large" onClick={handleStart} disabled={starting || completing} sx={{ mt: 2, minHeight: 56 }}>
              {starting ? 'Starting...' : 'Start Cleaning'}
            </Button>
            <Button variant="outlined" fullWidth size="small" onClick={doReset} disabled={starting || completing} sx={{ mt: 1 }}>
              Cancel
            </Button>
          </BinContextCard>
        )}
        {step === S.STARTED && (
          <Paper sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>Cleaning in progress — Bin {binData?.Bin_Number}</Alert>
            {binData?.Loading_ID && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Loading Information</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Box><strong>Material:</strong> {binData.Loading_Material_Name || '—'}</Box>
                  <Box><strong>Batch:</strong> {binData.Batch_Number || '—'}</Box>
                  <Box><strong>Loaded By:</strong> {binData.Loaded_By_Name || '—'}</Box>
                  <Box><strong>Loaded At:</strong> {binData.Loading_Start_At?.split('T')[0] || binData.Loading_Start_At?.split(' ')[0] || '—'}</Box>
                </Box>
              </Paper>
            )}
            {binData?.Unloading_ID && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Unloading Information</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Box><strong>Unloaded By:</strong> {binData.Unloaded_By_Name || '—'}</Box>
                  <Box><strong>Unloaded At:</strong> {binData.Unloading_Completed_At?.split('T')[0] || binData.Unloading_Completed_At?.split(' ')[0] || '—'}</Box>
                  <Box><strong>Condition:</strong> {binData.Unloading_Condition || '—'}</Box>
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
                {completing ? 'Completing...' : 'Complete Cleaning'}
              </Button>
              <Button variant="outlined" fullWidth size="small" onClick={workflow.cancelWorkflow} disabled={completing} sx={{ color: 'error.main', borderColor: 'error.main', mt: 1 }}>
                Cancel Workflow
              </Button>
            </Box>
          </Paper>
        )}
        {step === S.DONE && binData && (
          <ScanSuccess
            title="Cleaning Complete"
            binNumber={binData.Bin_Number}
            message={`Bin is now ${STATUS_LABELS[nextStatus] || 'awaiting QA'}.`}
            details={[
              { label: 'Material', value: binData.Loading_Material_Name || '—' },
              { label: 'Batch', value: binData.Batch_Number || '—' },
              { label: 'Next Stage', value: STATUS_LABELS[nextStatus] || 'Awaiting QA' },
            ]}
            onNext={doReset}
          />
        )}
        {step === S.COMPLETING && <LoadingSpinner fullScreen message="Completing cleaning..." />}
        </>
        )}
      </Box>
    </PortalLayout>
  );
}
