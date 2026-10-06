import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, IconButton, Tooltip, Alert, Grid, Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Science as ScienceIcon } from '@mui/icons-material';
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

const HAZARD_COLORS = { Low: 'success', Medium: 'warning', High: 'error' };

export default function MaterialMaster() {
  const { user, logout } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [form, setForm] = useState({ materialCode: '', materialName: '', materialCategory: '', hazardLevel: 'Low', tempMin: '', tempMax: '', handlingInstructions: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, material: null });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try { const res = await masterService.getAllMaterials(); setMaterials(res.data.data || []); } catch { setError('Failed to load materials'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { materialCode: form.materialCode, materialName: form.materialName, materialCategory: form.materialCategory || null, hazardLevel: form.hazardLevel, tempMin: form.tempMin ? Number(form.tempMin) : null, tempMax: form.tempMax ? Number(form.tempMax) : null, handlingInstructions: form.handlingInstructions || null };
      if (editingMaterial) await masterService.updateMaterial(editingMaterial.Material_ID, payload);
      else await masterService.createMaterial(payload);
      setDialogOpen(false); setEditingMaterial(null); setForm({ materialCode: '', materialName: '', materialCategory: '', hazardLevel: 'Low', tempMin: '', tempMax: '', handlingInstructions: '' }); fetch();
    } catch (e) { setError(e.response?.data?.error?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    try { await masterService.deleteMaterial(deleteDialog.material.Material_ID); setDeleteDialog({ open: false, material: null }); fetch(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Deactivation failed'); setDeleteDialog({ open: false, material: null }); }
  };

  const openAdd = () => { setEditingMaterial(null); setForm({ materialCode: '', materialName: '', materialCategory: '', hazardLevel: 'Low', tempMin: '', tempMax: '', handlingInstructions: '' }); setDialogOpen(true); };
  const openEdit = (m) => { setEditingMaterial(m); setForm({ materialName: m.Material_Name, materialCategory: m.Material_Category || '', hazardLevel: m.Hazard_Level || 'Low', tempMin: m.Temp_Min ?? '', tempMax: m.Temp_Max ?? '', handlingInstructions: m.Handling_Instructions || '' }); setDialogOpen(true); };

  const columns = [
    { key: 'Material_Code', label: 'Code', sortable: true, minWidth: 110 },
    { key: 'Material_Name', label: 'Name', sortable: true, minWidth: 180 },
    { key: 'Material_Category', label: 'Category', minWidth: 120, render: (r) => r.Material_Category || '\u2014' },
    { key: 'Hazard_Level', label: 'Hazard', minWidth: 100, render: (r) => <Chip label={r.Hazard_Level} size="small" color={HAZARD_COLORS[r.Hazard_Level] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }} /> },
    { key: 'Temp_Range', label: 'Temp Range', minWidth: 130, render: (r) => r.Temp_Min || r.Temp_Max ? `${r.Temp_Min ?? '\u2014'} / ${r.Temp_Max ?? '\u2014'}` : '\u2014' },
    { key: 'Status', label: 'Status', minWidth: 100, render: (r) => <StatusChip status={r.Is_Active ? 'Active' : 'Inactive'} type="user" /> },
    { key: 'actions', label: 'Actions', minWidth: 100, sx: { textAlign: 'right' }, cellSx: { textAlign: 'right' }, render: (r) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        {r.Is_Active === 1 && <Tooltip title="Deactivate"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, material: r })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
      </Box>
    )},
  ];

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <PageHeader title="Material Master" actionLabel="Add Material" onAction={openAdd} subtitle="Manage pharmaceutical materials and substances" />
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
        {loading ? <LoadingSpinner /> : materials.length === 0 ? (
          <EmptyState icon={<ScienceIcon sx={{ fontSize: 48 }} />} title="No materials found" actionLabel="Add Material" onAction={openAdd} />
        ) : (
          <DataTable columns={columns} rows={materials} keyField="Material_ID" />
        )}

        <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>{editingMaterial ? 'Edit Material' : 'Add Material'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                {!editingMaterial && (
                  <Grid item xs={12}>
                    <TextField label="Material Code" value={form.materialCode} onChange={e => setForm({ ...form, materialCode: e.target.value })} required fullWidth size="small" />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField label="Material Name" value={form.materialName} onChange={e => setForm({ ...form, materialName: e.target.value })} required fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Category" value={form.materialCategory} onChange={e => setForm({ ...form, materialCategory: e.target.value })} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select label="Hazard Level" value={form.hazardLevel} onChange={e => setForm({ ...form, hazardLevel: e.target.value })} fullWidth size="small">
                    {['Low', 'Medium', 'High'].map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Min Temp (°C)" type="number" value={form.tempMin} onChange={e => setForm({ ...form, tempMin: e.target.value })} fullWidth size="small" />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Max Temp (°C)" type="number" value={form.tempMax} onChange={e => setForm({ ...form, tempMax: e.target.value })} fullWidth size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Handling Instructions" value={form.handlingInstructions} onChange={e => setForm({ ...form, handlingInstructions: e.target.value })} multiline rows={2} fullWidth size="small" helperText="Optional safety guidelines" />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} size="small">Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} size="small">{saving ? 'Saving...' : 'Save'}</Button>
          </DialogActions>
        </Dialog>

        <ConfirmationDialog open={deleteDialog.open} title="Deactivate Material" message={`Deactivate ${deleteDialog.material?.Material_Code}?`} severity="warning" confirmLabel="Deactivate" onConfirm={handleDeactivate} onCancel={() => setDialogOpen(false)} />
      </Box>
    </PortalLayout>
  );
}
