import { Box, Typography, Tooltip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const STATUS_STEPS = [
  { key: 'Awaiting_Loading', label: 'Awaiting Loading', color: '#1565C0' },
  { key: 'Loading_In_Progress', label: 'Loading', color: '#1976D2' },
  { key: 'Awaiting_Unloading', label: 'Awaiting Unloading', color: '#EF6C00' },
  { key: 'Unloading_In_Progress', label: 'Unloading', color: '#F57C00' },
  { key: 'Awaiting_Cleaning', label: 'Awaiting Cleaning', color: '#00838F' },
  { key: 'Cleaning_In_Progress', label: 'Cleaning', color: '#26A69A' },
  { key: 'Awaiting_QA', label: 'Awaiting QA', color: '#7B1FA2' },
  { key: 'QA_In_Progress', label: 'QA In Progress', color: '#9C27B0' },
  { key: 'QA_Passed', label: 'Completed', color: '#2E7D32' },
];

function getStepState(statusKey, currentStatus, counts) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus);
  const stepIdx = STATUS_STEPS.findIndex(s => s.key === statusKey);

  if (currentStatus === 'QA_Failed' || currentStatus === 'Reinspection_Cleaning' || currentStatus === 'Awaiting_Reinspection') {
    if (stepIdx <= 6) return 'completed';
    return 'pending';
  }

  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export default function WorkflowFlow({ statusCounts = {} }) {
  if (!statusCounts || Object.keys(statusCounts).length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'auto', py: 0.5 }}>
      {STATUS_STEPS.map((step, idx) => {
        const count = statusCounts[step.key] || 0;
        const state = 'pending';

        return (
          <Box key={step.key} sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Tooltip title={`${step.label}${count > 0 ? `: ${count} bins` : ''}`}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 1,
                  borderRadius: 1,
                  backgroundColor: count > 0 ? `${step.color}08` : 'transparent',
                  border: '1px solid',
                  borderColor: count > 0 ? `${step.color}30` : 'transparent',
                  flex: 1,
                  minWidth: 0,
                  cursor: 'default',
                }}
              >
                <Box sx={{ color: step.color, display: 'flex', alignItems: 'center' }}>
                  {state === 'completed' ? (
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  ) : state === 'active' ? (
                    <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <HourglassEmptyIcon sx={{ fontSize: 16, opacity: 0.5 }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: step.color,
                      display: 'block',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {step.label}
                  </Typography>
                  {count > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: step.color,
                        display: 'block',
                        lineHeight: 1.2,
                      }}
                    >
                      {count} bin{count !== 1 ? 's' : ''}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Tooltip>
            {idx < STATUS_STEPS.length - 1 && (
              <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.disabled', mx: 0.25, flexShrink: 0 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
