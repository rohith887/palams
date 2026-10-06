import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, Paper, Button, Chip, Alert, Divider,
  Checkbox, FormControlLabel, TextField, IconButton, Tooltip,
  List, ListItem, ListItemText, ListItemIcon,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress,
} from '@mui/material';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PageHeader from '../../../components/common/PageHeader';
import useAuth from '../../../hooks/useAuth';
import qaService from '../../../services/qaService';
import { STATUS_LABELS } from '../../../constants/statusLabels';

import Inventory2Icon from '@mui/icons-material/Inventory2';
import ScienceIcon from '@mui/icons-material/Science';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StorageIcon from '@mui/icons-material/Storage';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const CHECKLIST_ITEMS = [
  { key: 'exterior_clean', label: 'Exterior Clean' },
  { key: 'interior_clean', label: 'Interior Clean' },
  { key: 'dry', label: 'Dry' },
  { key: 'no_damage', label: 'No Damage' },
  { key: 'odor_free', label: 'Odor Free' },
  { key: 'label_removed', label: 'Label Removed' },
  { key: 'container_verified', label: 'Container Verified' },
  { key: 'seal_verified', label: 'Seal Verified' },
  { key: 'documentation_verified', label: 'Documentation Verified' },
];

function getStatusColor(status) {
  if (status === 'Awaiting_QA' || status === 'Awaiting_Reinspection') return 'primary';
  if (status === 'QA_In_Progress') return 'info';
  if (status === 'QA_Passed') return 'success';
  if (status === 'QA_Failed') return 'error';
  return 'default';
}

function formatDT(iso) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString();
}

function sectionLabel(text) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.25 }}>
      {text}
    </Typography>
  );
}

export default function QAWorkspace() {
  const { binId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [inspectionCtx, setInspectionCtx] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [checklist, setChecklist] = useState(
    Object.fromEntries(CHECKLIST_ITEMS.map(c => [c.key, { passed: true, notes: '' }]))
  );
  const [generalRemarks, setGeneralRemarks] = useState('');

  const [confirmPass, setConfirmPass] = useState(false);
  const [confirmFail, setConfirmFail] = useState(false);

  const [photos, setPhotos] = useState([]);

  const fetchWorkspace = useCallback(async () => {
    if (!binId) return;
    setLoading(true);
    setError('');
    try {
      const res = await qaService.getWorkspace(binId);
      setWorkspace(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [binId]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);

  const handleStartQA = async () => {
    if (!workspace) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await qaService.startQA({
        binId: workspace.bin.binId,
        rowVersion: workspace.bin.rowVersion,
      });
      setInspectionCtx(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to start QA');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleItem = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: { ...prev[key], passed: !prev[key].passed },
    }));
  };

  const handleNotesChange = (key, value) => {
    setChecklist(prev => ({
      ...prev,
      [key]: { ...prev[key], notes: value },
    }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  };

  const computeOverallResult = () => {
    const allPassed = CHECKLIST_ITEMS.every(item => checklist[item.key].passed);
    return allPassed ? 'PASS' : 'FAIL';
  };

  const handlePassConfirm = async () => {
    setConfirmPass(false);
    if (!workspace || !inspectionCtx) return;
    setError('');
    setSubmitting(true);

    const exteriorPass = checklist.exterior_clean.passed;
    const interiorPass = checklist.interior_clean.passed;
    const containerPass = checklist.container_verified.passed;
    const visualPass = exteriorPass && interiorPass && containerPass;

    const dryPass = checklist.dry.passed;
    const damagePass = checklist.no_damage.passed;
    const odorPass = checklist.odor_free.passed;
    const labelPass = checklist.label_removed.passed;
    const sealPass = checklist.seal_verified.passed;

    const combinedVisualNotes = [
      ...(exteriorPass ? [] : ['Exterior Clean fail']),
      ...(interiorPass ? [] : ['Interior Clean fail']),
      ...(containerPass ? [] : ['Container Verified fail']),
      checklist.exterior_clean.notes,
      checklist.interior_clean.notes,
      checklist.container_verified.notes,
    ].filter(Boolean).join('; ');

    const allNotes = CHECKLIST_ITEMS
      .filter(item => checklist[item.key].notes)
      .map(item => `${item.label}: ${checklist[item.key].notes}`)
      .join('\n');

    const payload = {
      binId: workspace.bin.binId,
      rowVersion: workspace.bin.rowVersion,
      overallResult: 'PASS',
      failureReason: null,
      visual: visualPass ? 'Pass' : 'Fail',
      visualNotes: combinedVisualNotes || null,
      residue: dryPass ? 'Pass' : 'Fail',
      residueNotes: checklist.dry.notes || null,
      damage: damagePass ? 'Pass' : 'Fail',
      damageNotes: checklist.no_damage.notes || null,
      odor: odorPass ? 'Pass' : 'Fail',
      odorNotes: checklist.odor_free.notes || null,
      label: labelPass ? 'Pass' : 'Fail',
      labelNotes: checklist.label_removed.notes || null,
      seal: sealPass ? 'Pass' : 'Fail',
      sealNotes: checklist.seal_verified.notes || null,
    };

    try {
      const res = await qaService.completeQA(payload);
      const finalStatus = res.data.data.finalStatus;
      setInspectionCtx(null);
      setSuccessMsg(`QA Passed! Bin status: ${STATUS_LABELS[finalStatus] || finalStatus}`);
      fetchWorkspace();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to complete QA');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFailClick = () => {
    setConfirmFail(true);
  };

  if (loading) {
    return (
      <PortalLayout user={user} onLogout={logout}>
        <LoadingSpinner />
      </PortalLayout>
    );
  }

  if (error && !workspace) {
    return (
      <PortalLayout user={user} onLogout={logout}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
          <Button variant="outlined" onClick={() => navigate('/qa/queue')}>Back to Queue</Button>
        </Box>
      </PortalLayout>
    );
  }

  const w = workspace;
  const canStart = w?.workflow?.canStartQA && !inspectionCtx;
  const showInspectionForm = inspectionCtx || w?.workflow?.isInProgress;
  const overallResult = computeOverallResult();

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title={`Bin ${w.bin.binNumber}`} subtitle="QA Inspection Workspace">
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/qa/queue')}>
            Queue
          </Button>
        </PageHeader>

        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

        <Grid container spacing={1.5}>
          {/* ===== LEFT COLUMN: Bin Information ===== */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 1.5, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Inventory2Icon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="h3" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Bin Information
                </Typography>
              </Box>

              {sectionLabel('Status')}
              <Chip
                label={STATUS_LABELS[w.bin.currentStatus] || w.bin.currentStatus}
                color={getStatusColor(w.bin.currentStatus)}
                size="small"
                sx={{ mb: 1 }}
              />

              {w.bin.requiresQaAttention && (
                <Alert severity="error" sx={{ mb: 1, py: 0.25, fontSize: '0.75rem' }}>
                  Requires QA Attention
                </Alert>
              )}

              {sectionLabel('Material')}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <ScienceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2">{w.material.materialName || '\u2014'}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {w.material.category || ''} {w.material.category && w.material.hazardLevel ? '\u2022' : ''} {w.material.hazardLevel || ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Batch: {w.material.batchNumber || '\u2014'} / {w.material.quantityLoaded ?? '\u2014'} {w.material.unitOfMeasure || ''}
              </Typography>

              <Divider sx={{ my: 0.75 }} />

              {sectionLabel('Location')}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2">{w.location.bayName || '\u2014'} ({w.location.bayCode || ''})</Typography>
              </Box>
              {w.location.tankName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <StorageIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="body2">{w.location.tankName} ({w.location.tankCode})</Typography>
                </Box>
              )}

              <Divider sx={{ my: 0.75 }} />

              {sectionLabel('Cleaning Operator')}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2">{w.cleaning.cleanerName || '\u2014'}</Typography>
              </Box>
              {sectionLabel('Cleaning Completed')}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption">{formatDT(w.cleaning.completedAt)}</Typography>
              </Box>
              {w.cleaning.method && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {w.cleaning.method} / {w.cleaning.agent} / {w.cleaning.waterTemp}°C / {w.cleaning.rinseCycles} cycles
                </Typography>
              )}
            </Paper>

            {!showInspectionForm && canStart && (
              <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartQA}
                  disabled={submitting}
                  sx={{ minHeight: 44 }}
                >
                  {submitting ? <CircularProgress size={20} /> : 'Start QA Inspection'}
                </Button>
                {w.workflow.isReinspection && (
                  <Chip label="Reinspection" color="warning" size="small" sx={{ mt: 0.75 }} />
                )}
              </Paper>
            )}
          </Grid>

          {/* ===== CENTER COLUMN: Checklist ===== */}
          <Grid item xs={12} md={6}>
            {showInspectionForm ? (
              <>
                <Paper sx={{ p: 1.5, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="h3" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Inspection Checklist
                    </Typography>
                  </Box>

                  {CHECKLIST_ITEMS.map(item => (
                    <Paper
                      key={item.key}
                      variant="outlined"
                      sx={{
                        p: 1, mb: 0.75,
                        borderColor: checklist[item.key].passed ? 'success.light' : 'error.light',
                        bgcolor: checklist[item.key].passed ? 'success.0' : 'error.0',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={checklist[item.key].passed}
                              onChange={() => handleToggleItem(item.key)}
                              size="small"
                              sx={{ py: 0 }}
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                textDecoration: checklist[item.key].passed ? 'none' : 'line-through',
                                color: checklist[item.key].passed ? 'text.primary' : 'error.main',
                              }}
                            >
                              {item.label}
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                        <Tooltip title="Attach photo">
                          <IconButton size="small" sx={{ ml: 'auto', mt: -0.25 }}>
                            <PhotoCameraIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Remarks (optional)"
                        value={checklist[item.key].notes}
                        onChange={e => handleNotesChange(item.key, e.target.value)}
                        multiline
                        rows={1}
                        sx={{ mt: 0.5 }}
                        inputProps={{ maxLength: 500 }}
                      />
                    </Paper>
                  ))}
                </Paper>

                <Paper sx={{ p: 1.5, mb: 1.5 }}>
                  <Typography variant="h3" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.75 }}>
                    Remarks
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="General inspection remarks..."
                    value={generalRemarks}
                    onChange={e => setGeneralRemarks(e.target.value)}
                    multiline
                    rows={3}
                    inputProps={{ maxLength: 1000 }}
                  />
                </Paper>

                <Paper sx={{ p: 1.5, mb: 1.5 }}>
                  <Typography variant="h3" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.75 }}>
                    Photo Attachments
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      startIcon={<PhotoCameraIcon />}
                    >
                      Add Photo
                      <input type="file" hidden accept="image/*" multiple onChange={handlePhotoChange} />
                    </Button>
                  </Box>
                  {photos.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {photos.map((photo, idx) => (
                        <Chip
                          key={idx}
                          label={photo.name}
                          size="small"
                          variant="outlined"
                          onDelete={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                        />
                      ))}
                    </Box>
                  )}
                  {photos.length === 0 && (
                    <Typography variant="caption" color="text.disabled">
                      No photos attached
                    </Typography>
                  )}
                </Paper>
              </>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h4" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
                  Inspection Not Started
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  {w.bin.currentStatus === 'QA_Passed'
                    ? 'This bin has already passed QA inspection.'
                    : w.bin.currentStatus === 'QA_Failed'
                    ? 'This bin has failed QA inspection.'
                    : 'Click "Start QA Inspection" in the left panel to begin.'}
                </Typography>
              </Paper>
            )}
          </Grid>

          {/* ===== RIGHT COLUMN: Timeline & Actions ===== */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 1.5, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="h3" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Inspection Timeline
                </Typography>
              </Box>
              {w.previousInspections.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  No previous inspections
                </Typography>
              ) : (
                <List dense disablePadding>
                  {w.previousInspections.map((qa, idx) => (
                    <ListItem key={qa.QA_ID} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        {qa.Overall_Result === 'PASS'
                          ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          : <CancelIcon sx={{ fontSize: 14, color: 'error.main' }} />
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip label={qa.Overall_Result} size="small" color={qa.Overall_Result === 'PASS' ? 'success' : 'error'} sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem', px: 0.5 } }} />
                            {qa.Is_Reinspection ? <Chip label="Reinspection" size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem', px: 0.5 } }} /> : null}
                          </Box>
                        }
                        secondary={formatDT(qa.QA_Completed_At)}
                        primaryTypographyProps={{ fontSize: '0.75rem' }}
                        secondaryTypographyProps={{ fontSize: '0.6rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Paper sx={{ p: 1.5, mb: 1.5 }}>
              {sectionLabel('Workflow Status')}
              <Chip
                label={STATUS_LABELS[w.bin.currentStatus] || w.bin.currentStatus}
                color={getStatusColor(w.bin.currentStatus)}
                size="small"
                sx={{ mb: 1 }}
              />
              {sectionLabel('Current User')}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2">{user?.fullName || user?.username || '\u2014'}</Typography>
              </Box>
              {w.bin.consecutiveFailCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WarningAmberIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" color="warning.main">
                    {w.bin.consecutiveFailCount} consecutive failure{w.bin.consecutiveFailCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Paper>

            {showInspectionForm && (
              <Paper sx={{ p: 1.5 }}>
                <Typography variant="h3" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
                  Actions
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setConfirmPass(true)}
                    disabled={submitting || overallResult !== 'PASS'}
                    sx={{ minHeight: 40 }}
                  >
                    {submitting ? 'Submitting...' : 'PASS'}
                  </Button>

                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    startIcon={<CancelIcon />}
                    onClick={handleFailClick}
                    disabled={submitting}
                    sx={{ minHeight: 40 }}
                  >
                    FAIL
                  </Button>

                  <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    onClick={() => navigate('/qa/queue')}
                    sx={{ minHeight: 36 }}
                  >
                    Cancel
                  </Button>
                </Box>

                {overallResult !== 'PASS' && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.25, fontSize: '0.7rem' }}>
                    Some items are unchecked. PASS is disabled.
                  </Alert>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Pass confirmation dialog */}
      <Dialog open={confirmPass} onClose={() => setConfirmPass(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm PASS</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            All checklist items passed. Submit QA result as <strong>PASS</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Bin will move to QA Passed status and become ready for loading.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPass(false)} size="small">Cancel</Button>
          <Button variant="contained" color="success" onClick={handlePassConfirm} size="small">
            Confirm PASS
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fail dialog — no failure logic yet */}
      <Dialog open={confirmFail} onClose={() => setConfirmFail(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm FAIL</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Failure reason capture is not yet implemented.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFail(false)} size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </PortalLayout>
  );
}
