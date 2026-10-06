import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Button, TextField, MenuItem, Alert, LinearProgress, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Typography } from '@mui/material';
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
import qaService from '../../../services/qaService';
import axiosInstance from '../../../utils/axiosInstance';
import masterService from '../../../services/masterService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

const MIN_FAILURE_REASON = 20;
const QA_STATE_KEY = 'pblms_qa_form_state';

function saveQaFormState(overallResult, failureReason, comments) {
  try {
    sessionStorage.setItem(QA_STATE_KEY, JSON.stringify({ overallResult, failureReason, comments, _timestamp: Date.now() }));
  } catch {}
}

function restoreQaFormState() {
  try {
    const raw = sessionStorage.getItem(QA_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed._timestamp > 60000) {
      sessionStorage.removeItem(QA_STATE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearQaFormState() {
  try { sessionStorage.removeItem(QA_STATE_KEY); } catch {}
}

export default function ScanInspect() {
  const { user, logout } = useAuth();
  const workflow = useOperatorWorkflow({ operationLabel: 'Scan & Inspect', role: 'QA Inspector', expectedStatuses: ['Awaiting_QA', 'Awaiting_Reinspection'] });
  const saved = restoreQaFormState();
  const [overallResult, setOverallResult] = useState(saved?.overallResult || 'PASS');
  const [failureReason, setFailureReason] = useState(saved?.failureReason || '');
  const [finalStatus, setFinalStatus] = useState(null);
  const [comments, setComments] = useState(saved?.comments || '');
  const [bays, setBays] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [form, setForm] = useState({ bayId: '', tankId: '' });
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

  useEffect(() => {
    if (workflow.step === S.STARTED) {
      saveQaFormState(overallResult, failureReason, comments);
    } else {
      clearQaFormState();
    }
  }, [workflow.step, overallResult, failureReason, comments]);

  const handleStart = () => workflow.handleStart(async (bd) => {
    await qaService.startQA({ binId: bd.Bin_ID, rowVersion: bd.Row_Version });
    const r = await axiosInstance.get(`/v1/bins/${bd.Bin_ID}`);
    if (r.data?.data) Object.assign(bd, r.data.data);
  });

  const handleComplete = useCallback(() => {
    if (overallResult === 'FAIL' && failureReason.length < MIN_FAILURE_REASON) {
      workflow.setFormError({ code: 'VALIDATION', message: `Failure reason must be at least ${MIN_FAILURE_REASON} characters` });
      return;
    }
    workflow.handleComplete(async (bd) => {
      const res = await qaService.completeQA({
        binId: bd.Bin_ID, rowVersion: bd.Row_Version,
        overallResult, failureReason: overallResult === 'FAIL' ? failureReason : null,
        comments: overallResult === 'PASS' ? comments : undefined,
      });
      setFinalStatus(res.data?.data?.finalStatus || (overallResult === 'PASS' ? 'Retired' : 'Reinspection_Cleaning'));
    });
  }, [overallResult, failureReason, comments, workflow]);

  const doReset = () => {
    workflow.doReset();
    setOverallResult('PASS');
    setFailureReason('');
    setFinalStatus(null);
    setComments('');
    clearQaFormState();
    setForm({ bayId: '', tankId: '' });
  };

  const failureReasonValid = overallResult !== 'FAIL' || failureReason.length >= MIN_FAILURE_REASON;
  const submitDisabled = overallResult === 'FAIL'
    ? failureReason.length < MIN_FAILURE_REASON || workflow.completing
    : workflow.completing;

  const { step, binData, error, formError, isLoading, workflowResult, completing, starting, offline, recovering, recoveryBanner, retryError, retryLastOperation, handleScan, handleContinue } = workflow;

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <OperationHeader title="Scan & Inspect" role="QA Inspector" />
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
            role="QA Inspector"
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
            {binData?.Current_Status === 'Awaiting_Reinspection' && (
              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8125rem', py: 0.5 }}>Reinspection — Prior QA failure</Alert>
            )}
            <Button variant="contained" fullWidth size="large" onClick={handleStart} disabled={starting || completing} sx={{ mt: 2, minHeight: 56 }}>
              {starting ? 'Starting...' : 'Start Inspection'}
            </Button>
            <Button variant="outlined" fullWidth size="small" onClick={doReset} disabled={starting || completing} sx={{ mt: 1 }}>
              Cancel
            </Button>
          </BinContextCard>
        )}
        {step === S.STARTED && (
          <Paper sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>QA in progress — Bin {binData?.Bin_Number}</Alert>
            {binData?.Loading_ID && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Loading</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Box><strong>Material:</strong> {binData.Loading_Material_Name || '—'}</Box>
                  <Box><strong>Batch:</strong> {binData.Batch_Number || '—'}</Box>
                  <Box><strong>Loaded By:</strong> {binData.Loaded_By_Name || '—'}</Box>
                  <Box><strong>Loaded At:</strong> {binData.Loading_Start_At?.split('T')[0] || binData.Loading_Start_At?.split(' ')[0] || '—'}</Box>
                </Box>
              </Paper>
            )}
            {binData?.Unloading_ID && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Unloading</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Box><strong>Unloaded By:</strong> {binData.Unloaded_By_Name || '—'}</Box>
                  <Box><strong>Unloaded At:</strong> {binData.Unloading_Completed_At?.split('T')[0] || binData.Unloading_Completed_At?.split(' ')[0] || '—'}</Box>
                </Box>
              </Paper>
            )}
            {binData?.Cleaning_ID && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Cleaning</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Box><strong>Cleaned By:</strong> {binData.Cleaned_By_Name || '—'}</Box>
                  <Box><strong>Cleaned At:</strong> {binData.Cleaning_Completed_At?.split('T')[0] || binData.Cleaning_Completed_At?.split(' ')[0] || '—'}</Box>
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

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>QA Result</FormLabel>
                  <RadioGroup row value={overallResult} onChange={e => { setOverallResult(e.target.value); setFailureReason(''); }}>
                    <FormControlLabel value="PASS" control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }} />} label="PASS" />
                    <FormControlLabel value="FAIL" control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }} />} label="FAIL" />
                  </RadioGroup>
                </FormControl>
              </Paper>

              {overallResult === 'FAIL' && (
                <TextField label="Failure Reason" multiline rows={3} value={failureReason}
                  onChange={e => setFailureReason(e.target.value)} required fullWidth size="small"
                  error={failureReason.length > 0 && failureReason.length < MIN_FAILURE_REASON}
                  helperText={failureReason.length >= MIN_FAILURE_REASON
                    ? `${failureReason.length} characters`
                    : `${failureReason.length}/${MIN_FAILURE_REASON} minimum — ${MIN_FAILURE_REASON - failureReason.length} more needed`}
                  inputProps={{ maxLength: 1000 }}
                />
              )}

              {overallResult === 'PASS' && (
                <TextField label="Comments" value={comments} onChange={e => setComments(e.target.value)} size="small" multiline rows={2} inputProps={{ maxLength: 500 }} />
              )}

              <Button type="submit" variant="contained" fullWidth size="large" disabled={submitDisabled} sx={{ minHeight: 56 }}>
                {overallResult === 'PASS' ? 'Complete PASS' : 'Complete FAIL'}
              </Button>
              <Button variant="outlined" fullWidth size="small" onClick={workflow.cancelWorkflow} disabled={completing} sx={{ color: 'error.main', borderColor: 'error.main' }}>
                Cancel Workflow
              </Button>
            </Box>
          </Paper>
        )}
        {step === S.DONE && binData && (
          <ScanSuccess
            title="QA Complete"
            binNumber={binData.Bin_Number}
            message={`Bin is now ${STATUS_LABELS[finalStatus] || (overallResult === 'PASS' ? 'awaiting loading' : 'awaiting re-cleaning')}.`}
            details={[
              { label: 'Result', value: overallResult === 'PASS' ? 'PASSED' : 'FAILED' },
              { label: 'Material', value: binData.Loading_Material_Name || '—' },
              { label: 'Batch', value: binData.Batch_Number || '—' },
              { label: 'Next Stage', value: STATUS_LABELS[finalStatus] || (overallResult === 'PASS' ? 'Retired' : 'Reinspection Cleaning') },
            ]}
            onNext={doReset}
          />
        )}
        {step === S.COMPLETING && <LoadingSpinner fullScreen message="Completing QA..." />}
        </>
        )}
      </Box>
    </PortalLayout>
  );
}
