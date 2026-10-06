import { Grid } from '@mui/material';
import KpiTile from '../KpiTile';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ScienceIcon from '@mui/icons-material/Science';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';

export default function KpiCards({ metrics }) {
  const kpis = [
    {
      label: 'Total Bins',
      value: metrics?.total_active_bins || 0,
      icon: <InventoryIcon />,
    },
    {
      label: 'Available Bins',
      value: metrics?.awaiting_loading || 0,
      icon: <CheckCircleOutlineIcon />,
    },
    {
      label: 'Loading',
      value: metrics?.loading_in_progress || 0,
      icon: <AutorenewIcon />,
    },
    {
      label: 'Unloading',
      value: metrics?.unloading_in_progress || 0,
      icon: <LocalShippingIcon />,
    },
    {
      label: 'Cleaning',
      value: metrics?.cleaning_in_progress || 0,
      icon: <CleaningServicesIcon />,
    },
    {
      label: 'QA',
      value: metrics?.qa_in_progress || 0,
      icon: <ScienceIcon />,
    },
    {
      label: 'Completed Today',
      value: metrics?.completed_today || 0,
      icon: <TaskAltIcon />,
    },
    {
      label: 'Rejected Today',
      value: metrics?.rejected_today || 0,
      icon: <CancelIcon />,
      color: metrics?.rejected_today > 0 ? 'error.main' : 'inherit',
    },
  ];

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi) => (
        <Grid item xs={12} sm={6} md={3} lg={1.5} key={kpi.label}>
          <KpiTile
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sx={{ height: '100%', color: kpi.color }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
