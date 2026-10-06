import { useState, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Grid, Chip,
  Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PageHeader from '../../../components/common/PageHeader';
import Section from '../../../components/enterprise/Section';
import useAuth from '../../../hooks/useAuth';
import binService from '../../../services/binService';
import workflowService from '../../../services/workflowService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

export default function WorkflowMonitor() {
  const { user, logout } = useAuth();
  const [binNumber, setBinNumber] = useState('');
  const [binData, setBinData] = useState(null);
  const [transitionCheck, setTransitionCheck] = useState({ fromStatus: '', toStatus: '' });
  const [transitionResult, setTransitionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearchBin = useCallback(async () => {
    if (!binNumber.trim()) return;
    setError(''); setBinData(null); setTransitionResult(null); setLoading(true);
    try {
      const res = await binService.getBins();
      const bins = res.data.data || [];
      const found = bins.find(b => b.Bin_Number?.toLowerCase() === binNumber.trim().toLowerCase());
      if (found) { setBinData(found); setTransitionCheck({ fromStatus: found.Current_Status, toStatus: '' }); }
      else { setError(`Bin "${binNumber.trim()}" not found`); }
    } catch (e) { setError('Failed to fetch bin data'); }
    finally { setLoading(false); }
  }, [binNumber]);

  const handleCheckTransition = useCallback(async () => {
    if (!binData || !transitionCheck.toStatus) return;
    setError(''); setTransitionResult(null); setLoading(true);
    try {
      const res = await workflowService.validateTransition({
        binId: binData.Bin_ID, fromStatus: transitionCheck.fromStatus,
        toStatus: transitionCheck.toStatus, rowVersion: binData.Row_Version,
      });
      setTransitionResult(res.data.data);
    } catch (e) {
      const errData = e.response?.data?.error;
      setTransitionResult({ valid: false, errorCode: errData?.code || 'UNKNOWN', message: errData?.message || 'Transition validation failed' });
    } finally { setLoading(false); }
  }, [binData, transitionCheck]);

  const validNextStatuses = binData
    ? ['Awaiting_Loading','Loading_In_Progress','Awaiting_Unloading','Unloading_In_Progress',
       'Awaiting_Cleaning','Cleaning_In_Progress','Awaiting_QA','QA_In_Progress',
       'QA_Passed','QA_Failed','Reinspection_Cleaning','Awaiting_Reinspection','Retired']
      .filter(s => s !== binData.Current_Status)
    : [];

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Workflow Monitor" subtitle="Validate bin status transitions" />

        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

        <Section>
          <Grid container spacing={1.5} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={4}>
              <TextField label="Bin Number" value={binNumber} onChange={(e) => setBinNumber(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchBin()} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearchBin} disabled={loading} fullWidth size="small">Search</Button>
            </Grid>
          </Grid>
        </Section>

        {loading && <LoadingSpinner />}

        {binData && !loading && (
          <Section title={`Bin: ${binData.Bin_Number}`}>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Current Status</Typography>
                <Box sx={{ mt: 0.25 }}><Chip label={STATUS_LABELS[binData.Current_Status] || binData.Current_Status} color="primary" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} /></Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Row Version</Typography>
                <Typography variant="body2">{binData.Row_Version}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Bin Type</Typography>
                <Typography variant="body2">{binData.Bin_Type_Name || '\u2014'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                <Typography variant="body2">{binData.Bin_Category_Name || '\u2014'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Active</Typography>
                <Box sx={{ mt: 0.25 }}><Chip label={binData.Is_Active ? 'Active' : 'Inactive'} color={binData.Is_Active ? 'success' : 'default'} size="small" /></Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Admin Review</Typography>
                <Box sx={{ mt: 0.25 }}><Chip label={binData.Requires_Admin_Review ? 'Required' : 'None'} color={binData.Requires_Admin_Review ? 'warning' : 'default'} size="small" /></Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Consecutive Failures</Typography>
                <Typography variant="body2">{binData.Consecutive_Fail_Count ?? 0}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Last QA Date</Typography>
                <Typography variant="body2">{binData.Last_QA_Date ? new Date(binData.Last_QA_Date).toLocaleDateString() : '\u2014'}</Typography>
              </Grid>
            </Grid>
          </Section>
        )}

        {binData && !loading && (
          <Section title="Transition Preview">
            <Grid container spacing={1.5} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={4}>
                <TextField select label="Target Status" size="small" value={transitionCheck.toStatus} onChange={(e) => setTransitionCheck({ ...transitionCheck, toStatus: e.target.value })} SelectProps={{ native: true }} fullWidth>
                  <option value="">-- Select target status --</option>
                  {validNextStatuses.map(s => (<option key={s} value={s}>{STATUS_LABELS[s] || s}</option>))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button variant="contained" onClick={handleCheckTransition} disabled={!transitionCheck.toStatus || loading} size="small" fullWidth>Validate</Button>
              </Grid>
            </Grid>

            {transitionResult && (
              <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: transitionResult.valid ? '#E8F5E9' : '#FFEBEE', borderRadius: 1, border: '1px solid', borderColor: transitionResult.valid ? '#A5D6A7' : '#EF9A9A' }}>
                <Typography variant="subtitle2" sx={{ color: transitionResult.valid ? 'success.main' : 'error.main', fontWeight: 600, fontSize: '0.8125rem' }}>
                  {transitionResult.valid ? '\u2713 Valid Transition' : `\u2717 Invalid \u2014 ${transitionResult.errorCode || 'Unknown'}`}
                </Typography>
                {transitionResult.valid ? (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" display="block">Operation Type: <strong>{transitionResult.operationType}</strong></Typography>
                    <Typography variant="caption" display="block">Requires Lock: <strong>{transitionResult.requiresLock ? 'Yes' : 'No'}</strong></Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{transitionResult.message}</Typography>
                )}
              </Box>
            )}
          </Section>
        )}

        <Section title="Available Statuses">
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontSize: '0.75rem' }}>
            All workflow transitions are defined in the Transition_Master table. Contact your database administrator for configuration changes.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Label</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(STATUS_LABELS).map(([code, label]) => (
                  <TableRow key={code} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{code}</TableCell>
                    <TableCell>{label}</TableCell>
                    <TableCell>
                      <Chip
                        label={code === 'Retired' ? 'Terminal' : code.includes('Passed') ? 'Completed' : code.includes('Failed') ? 'Failed' : 'Active'}
                        size="small"
                        color={code === 'Retired' ? 'default' : code.includes('Passed') ? 'success' : code.includes('Failed') ? 'error' : 'primary'}
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      </Box>
    </PortalLayout>
  );
}
