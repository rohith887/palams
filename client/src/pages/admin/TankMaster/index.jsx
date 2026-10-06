import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, IconButton, Tooltip, Alert, Grid,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, WaterDrop as WaterTankIcon } from '@mui/icons-material';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import StatusChip from '../../../components/common/StatusChip';
import EmptyState from '../../../components/common/EmptyState';
import Section from '../../../components/enterprise/Section';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import useAuth from '../../../hooks/useAuth';
import masterService from '../../../services/masterService';

export default function TankMaster() {
  const { user, logout } = useAuth();
  const [tanks, setTanks] = useState([]);
  const [bays, setBays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState(null);
  const [form, setForm] = useState({ bayId: '', tankCode: '', tankName: '', tankCapacity: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, tank: null });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [tRes, bRes] = await Promise.all([masterService.getTanks(), masterService.getBays()]);
      setTanks(tRes.data.data || []); setBays(bRes.data.data || []);
    } catch { setError('Failed to load tanks'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { bayId: Number(form.bayId), tankCode: form.tankCode, tankName: form.tankName, tankCapacity: form.tankCapacity ? Number(form.tankCapacity) : null };
      if (editingTank) await masterService.updateTank(editingTank.Tank_ID, payload);
      else await masterService.createTank(payload);
      setDialogOpen(false); setEditingTank(null); setForm({ bayId: '', tankCode: '', tankName: '', tankCapacity: '' }); fetch();
    } catch (e) { setError(e.response?.data?.error?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    try { await masterService.deleteTank(deleteDialog.tank.Tank_ID); setDeleteDialog({ open: false, tank: null }); fetch(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Deactivation failed'); setDeleteDialog({ open: false, tank: null }); }
  };

  const openAdd = () => { setEditingTank(null); setForm({ bayId: '', tankCode: '', tankName: '', tankCapacity: '' }); setDialogOpen(true); };
  const openEdit = (t) => { setEditingTank(t); setForm({ bayId: String(t.Bay_ID), tankName: t.Tank_Name, tankCapacity: t.Tank_Capacity || '' }); setDialogOpen(true); };

  const columns = [
    { key: 'Tank_Code', label: 'Tank Code', sortable: true, minWidth: 120 },
    { key: 'Tank_Name', label: 'Name', sortable: true, minWidth: 180 },
    { key: 'Bay', label: 'Bay', minWidth: 120, render: (r) => bays.find(b => b.Bay_ID === r.Bay_ID)?.Bay_Code || '\u2014' },
    { key: 'Tank_Capacity', label: 'Capacity', minWidth: 100, render: (r) => r.Tank_Capacity || '\u2014' },
    { key: 'Status', label: 'Status', minWidth: 100, render: (r) => <StatusChip status={r.Is_Active ? 'Active' : 'Inactive'} type="user" /> },
    { key: 'actions', label: 'Actions', minWidth: 100, sx: { textAlign: 'right' }, cellSx: { textAlign: 'right' }, render: (r) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        {r.Is_Active === 1 && <Tooltip title="Deactivate"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, tank: r })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
      </Box>
    )},
  ];

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Tank Management" actionLabel="Add Tank" onAction={openAdd} subtitle="Manage storage tanks associated with bays" />
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
        {loading ? <LoadingSpinner /> : tanks.length === 0 ? (
          <EmptyState icon={<WaterTankIcon sx={{ fontSize: 48 }} />} title="No tanks found" actionLabel="Add Tank" onAction={openAdd} />
        ) : (
          <DataTable columns={columns} rows={tanks} keyField="Tank_ID" />
        )}

        <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>{editingTank ? 'Edit Tank' : 'Add Tank'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField select label="Bay" value={form.bayId} onChange={e => setForm({ ...form, bayId: e.target.value })} required fullWidth size="small">
                    {bays.map(b => <MenuItem key={b.Bay_ID} value={b.Bay_ID}>{b.Bay_Code} — {b.Bay_Name}</MenuItem>)}
                  </TextField>
                </Grid>
                {!editingTank && (
                  <Grid item xs={12}>
                    <TextField label="Tank Code" value={form.tankCode} onChange={e => setForm({ ...form, tankCode: e.target.value })} required fullWidth size="small" />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField label="Tank Name" value={form.tankName} onChange={e => setForm({ ...form, tankName: e.target.value })} required fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Capacity (L)" type="number" value={form.tankCapacity} onChange={e => setForm({ ...form, tankCapacity: e.target.value })} fullWidth size="small" helperText="Optional" />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} size="small">Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} size="small">{saving ? 'Saving...' : 'Save'}</Button>
          </DialogActions>
        </Dialog>

        <ConfirmationDialog open={deleteDialog.open} title="Deactivate Tank" message={`Deactivate ${deleteDialog.tank?.Tank_Code}?`} severity="warning" confirmLabel="Deactivate" onConfirm={handleDeactivate} onCancel={() => setDeleteDialog({ open: false, tank: null })} />
      </Box>
    </PortalLayout>
  );
}
