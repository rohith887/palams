import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, IconButton, Tooltip, Alert, Grid,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Business as BusinessIcon } from '@mui/icons-material';
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

export default function BayMaster() {
  const { user, logout } = useAuth();
  const [bays, setBays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBay, setEditingBay] = useState(null);
  const [form, setForm] = useState({ bayCode: '', bayName: '', locationDescription: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, bay: null });
  const [saving, setSaving] = useState(false);

  const fetchBays = useCallback(async () => {
    try { const res = await masterService.getAllBays(); setBays(res.data.data || []); } catch (e) { setError('Failed to load bays'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBays(); }, [fetchBays]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingBay) { await masterService.updateBay(editingBay.Bay_ID, form); }
      else { await masterService.createBay(form); }
      setDialogOpen(false); setEditingBay(null); setForm({ bayCode: '', bayName: '', locationDescription: '' }); fetchBays();
    } catch (e) { setError(e.response?.data?.error?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    try {
      await masterService.deleteBay(deleteDialog.bay.Bay_ID);
      setDeleteDialog({ open: false, bay: null }); fetchBays();
    } catch (e) { setError(e.response?.data?.error?.message || 'Deactivation failed'); setDeleteDialog({ open: false, bay: null }); }
  };

  const openAdd = () => { setEditingBay(null); setForm({ bayCode: '', bayName: '', locationDescription: '' }); setDialogOpen(true); };
  const openEdit = (b) => { setEditingBay(b); setForm({ bayName: b.Bay_Name, locationDescription: b.Location_Description || '' }); setDialogOpen(true); };

  const columns = [
    { key: 'Bay_Code', label: 'Bay Code', sortable: true, minWidth: 120 },
    { key: 'Bay_Name', label: 'Name', sortable: true, minWidth: 180 },
    { key: 'Location_Description', label: 'Location', minWidth: 200, render: (r) => r.Location_Description || '\u2014' },
    { key: 'Status', label: 'Status', minWidth: 100, render: (r) => <StatusChip status={r.Is_Active ? 'Active' : 'Inactive'} type="user" /> },
    { key: 'actions', label: 'Actions', minWidth: 100, sx: { textAlign: 'right' }, cellSx: { textAlign: 'right' }, render: (r) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        {r.Is_Active === 1 && <Tooltip title="Deactivate"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, bay: r })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
      </Box>
    )},
  ];

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Bay Management" actionLabel="Add Bay" onAction={openAdd} subtitle="Manage storage bays and locations" />
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
        {loading ? <LoadingSpinner /> : bays.length === 0 ? (
          <EmptyState icon={<BusinessIcon sx={{ fontSize: 48 }} />} title="No bays found" message="Create the first bay to organize storage locations." actionLabel="Add Bay" onAction={openAdd} />
        ) : (
          <DataTable columns={columns} rows={bays} keyField="Bay_ID" />
        )}

        <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>{editingBay ? 'Edit Bay' : 'Add Bay'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                {!editingBay && (
                  <Grid item xs={12}>
                    <TextField label="Bay Code" value={form.bayCode} onChange={e => setForm({ ...form, bayCode: e.target.value })} required fullWidth size="small" />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField label="Bay Name" value={form.bayName} onChange={e => setForm({ ...form, bayName: e.target.value })} required fullWidth size="small" />
                </Grid>
                {editingBay && (
                  <Grid item xs={12}>
                    <TextField label="Location Description" value={form.locationDescription} onChange={e => setForm({ ...form, locationDescription: e.target.value })} multiline rows={2} fullWidth size="small" />
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} size="small">Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} size="small">{saving ? 'Saving...' : 'Save'}</Button>
          </DialogActions>
        </Dialog>

        <ConfirmationDialog open={deleteDialog.open} title="Deactivate Bay" message={`Are you sure you want to deactivate ${deleteDialog.bay?.Bay_Code}?`} severity="warning" confirmLabel="Deactivate" onConfirm={handleDeactivate} onCancel={() => setDeleteDialog({ open: false, bay: null })} />
      </Box>
    </PortalLayout>
  );
}
