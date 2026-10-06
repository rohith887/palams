import { Box, Typography, Paper, Grid, LinearProgress } from '@mui/material';
import Section from '../Section';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ScienceIcon from '@mui/icons-material/Science';
import AutorenewIcon from '@mui/icons-material/Autorenew';

const Operation = ({ icon, title, count, progress }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <Box sx={{ mr: 1.5 }}>{icon}</Box>
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2">{title}</Typography>
        <Typography variant="body2">{count}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress} />
    </Box>
  </Box>
);

export default function OperationsOverview({ metrics }) {
  const operations = [
    {
      title: 'Loading',
      icon: <LocalShippingIcon />,
      count: metrics?.loading_in_progress || 0,
      progress: ((metrics?.loading_in_progress || 0) / (metrics?.total_active_bins || 1)) * 100,
    },
    {
      title: 'Unloading',
      icon: <AutorenewIcon />,
      count: metrics?.unloading_in_progress || 0,
      progress: ((metrics?.unloading_in_progress || 0) / (metrics?.total_active_bins || 1)) * 100,
    },
    {
      title: 'Cleaning',
      icon: <CleaningServicesIcon />,
      count: metrics?.cleaning_in_progress || 0,
      progress: ((metrics?.cleaning_in_progress || 0) / (metrics?.total_active_bins || 1)) * 100,
    },
    {
      title: 'QA',
      icon: <ScienceIcon />,
      count: metrics?.qa_in_progress || 0,
      progress: ((metrics?.qa_in_progress || 0) / (metrics?.total_active_bins || 1)) * 100,
    },
  ];

  return (
    <Section title="Operations Overview">
      {operations.map((op) => (
        <Operation key={op.title} {...op} />
      ))}
    </Section>
  );
}
