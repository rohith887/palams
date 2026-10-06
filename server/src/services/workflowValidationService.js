const logger = require('../utils/logger');

const STATUS_INFO = {
  'Awaiting_Loading':      { stage: 'Loading',     nextRole: 'Loader',       nextFriendly: 'Loader',        friendly: 'awaiting loading',           previousVerb: 'been registered' },
  'Loading_In_Progress':   { stage: 'Loading',     nextRole: 'Loader',       nextFriendly: 'Loader',        friendly: 'being loaded',               previousVerb: 'been queued for loading' },
  'Awaiting_Unloading':    { stage: 'Unloading',   nextRole: 'Unloader',     nextFriendly: 'Unloader',      friendly: 'awaiting unloading',         previousVerb: 'been loaded' },
  'Unloading_In_Progress': { stage: 'Unloading',   nextRole: 'Unloader',     nextFriendly: 'Unloader',      friendly: 'being unloaded',             previousVerb: 'been queued for unloading' },
  'Awaiting_Cleaning':     { stage: 'Cleaning',    nextRole: 'Cleaner',      nextFriendly: 'Cleaner',       friendly: 'awaiting cleaning',          previousVerb: 'been unloaded' },
  'Cleaning_In_Progress':  { stage: 'Cleaning',    nextRole: 'Cleaner',      nextFriendly: 'Cleaner',       friendly: 'being cleaned',              previousVerb: 'been queued for cleaning' },
  'Reinspection_Cleaning': { stage: 'Cleaning',    nextRole: 'Cleaner',      nextFriendly: 'Cleaner',       friendly: 'awaiting re-cleaning',       previousVerb: 'been sent back for re-cleaning' },
  'Awaiting_QA':           { stage: 'QA',          nextRole: 'QA_Inspector', nextFriendly: 'QA Inspector',  friendly: 'awaiting QA inspection',     previousVerb: 'been cleaned' },
  'QA_In_Progress':        { stage: 'QA',          nextRole: 'QA_Inspector', nextFriendly: 'QA Inspector',  friendly: 'undergoing QA inspection',   previousVerb: 'been queued for QA' },
  'Awaiting_Reinspection': { stage: 'QA',          nextRole: 'QA_Inspector', nextFriendly: 'QA Inspector',  friendly: 'awaiting QA reinspection',   previousVerb: 'been re-cleaned' },
  'Completed':             { stage: null,           nextRole: null,           nextFriendly: null,            friendly: 'completed the full lifecycle', previousVerb: 'completed the full lifecycle' },
  'Retired':               { stage: null,           nextRole: null,           nextFriendly: null,            friendly: 'been retired from service',  previousVerb: 'been retired' },
};

/**
 * Role-specific friendly labels for the operation being attempted.
 */
const ROLE_EXPECTED = {
  'Loader':       ['Awaiting_Loading'],
  'Unloader':     ['Awaiting_Unloading'],
  'Cleaner':      ['Awaiting_Cleaning', 'Reinspection_Cleaning'],
  'QA_Inspector': ['Awaiting_QA', 'Awaiting_Reinspection'],
};

const ROLE_LABEL = {
  'Loader':       'Loading',
  'Unloader':     'Unloading',
  'Cleaner':      'Cleaning',
  'QA_Inspector': 'QA Inspection',
};

/**
 * Build the operator-friendly WRONG_STAGE message.
 * Explains what stage the bin is at and who should process it next,
 * without ever exposing raw status codes.
 */
function buildWrongStageMessage(currentStatus, statusInfo, roleLabel) {
  const nextFriendly = statusInfo.nextFriendly;
  const stageFriendly = statusInfo.friendly;

  // Bin is being actively worked on by someone else
  if (currentStatus.endsWith('_In_Progress')) {
    return {
      title: `Not Ready for ${roleLabel}`,
      message: `This bin is currently ${stageFriendly}.`,
      instruction: `Please scan a bin that is ready for ${roleLabel}.`,
    };
  }

  // Bin is waiting for a different role
  if (nextFriendly) {
    return {
      title: `Not Ready for ${roleLabel}`,
      message: `This bin is ${stageFriendly}. It is waiting for the ${nextFriendly}.`,
      instruction: `Please scan a bin that is ready for ${roleLabel}.`,
    };
  }

  return {
    title: `Not Available`,
    message: `This bin is ${stageFriendly} and cannot be processed.`,
    instruction: 'Please scan a different bin.',
  };
}

function validateWorkflow(binData, userId, userRole) {
  const currentStatus = binData.Current_Status;
  const statusInfo = STATUS_INFO[currentStatus];

  if (!statusInfo) {
    logger.warn('Unknown bin status encountered', { currentStatus, binId: binData.Bin_ID });
    return {
      workflowState: 'UNKNOWN',
      currentStatusRaw: currentStatus,
      currentStatus: currentStatus,
      nextOperator: null,
      nextOperatorFriendly: null,
      currentOperator: null,
      startedAt: null,
      friendly: {
        title: 'Status Unavailable',
        message: 'This bin has an unrecognized status.',
        instruction: 'Please contact your supervisor.',
      },
    };
  }

  const expected = ROLE_EXPECTED[userRole] || [];
  const roleLabel = ROLE_LABEL[userRole] || userRole;

  if (expected.includes(currentStatus)) {
    return buildReady(binData, statusInfo, currentStatus);
  }

  const IN_PROGRESS_MAP = {
    'Awaiting_Loading': 'Loading_In_Progress',
    'Awaiting_Unloading': 'Unloading_In_Progress',
    'Awaiting_Cleaning': 'Cleaning_In_Progress',
    'Reinspection_Cleaning': 'Cleaning_In_Progress',
    'Awaiting_QA': 'QA_In_Progress',
    'Awaiting_Reinspection': 'QA_In_Progress',
  };

  const inProgressForRole = expected.map(s => IN_PROGRESS_MAP[s]).filter(Boolean);
  const isInProgressForRole = inProgressForRole.includes(currentStatus);

  if (isInProgressForRole) {
    const currentOperatorId = getCurrentOperatorId(binData, userRole);
    const currentOperatorName = getCurrentOperatorName(binData, userRole);

    if (currentOperatorId && currentOperatorName) {
      if (currentOperatorId === userId) {
        // Same operator — allow resume
        return buildReady(binData, statusInfo, currentStatus);
      }
      return {
        workflowState: 'WRONG_OPERATOR',
        currentStatusRaw: currentStatus,
        currentStatus: statusInfo.friendly,
        nextOperator: statusInfo.nextRole,
        nextOperatorFriendly: statusInfo.nextFriendly,
        currentOperator: currentOperatorName,
        startedAt: getStartedAt(binData, userRole),
        friendly: {
          title: 'Already Being Processed',
          message: `${currentOperatorName} is currently processing this bin.`,
          instruction: 'Please scan a different bin.',
        },
      };
    }

    const lock = binData._activeLock;
    if (lock && lock.Locked_By_User_ID !== userId) {
      const lockedBy = lock.locked_by_name || 'another operator';
      return {
        workflowState: 'WRONG_OPERATOR',
        currentStatusRaw: currentStatus,
        currentStatus: statusInfo.friendly,
        nextOperator: statusInfo.nextRole,
        nextOperatorFriendly: statusInfo.nextFriendly,
        currentOperator: lockedBy,
        startedAt: null,
        friendly: {
          title: 'Already Being Processed',
          message: `${lockedBy} is currently processing this bin.`,
          instruction: 'Please scan a different bin.',
        },
      };
    }

    // In-progress for this role but no operator data — allow resume
    return buildReady(binData, statusInfo, currentStatus);
  }

  if (statusInfo.stage === null) {
    // Completed or Retired
    const isRetired = currentStatus === 'Retired';
    return {
      workflowState: 'ALREADY_COMPLETED',
      currentStatusRaw: currentStatus,
      currentStatus: statusInfo.friendly,
      nextOperator: null,
      nextOperatorFriendly: null,
      currentOperator: null,
      startedAt: null,
      friendly: {
        title: isRetired ? 'Bin Retired' : 'Lifecycle Complete',
        message: isRetired
          ? 'This bin has been retired from service.'
          : 'This bin has completed the entire lifecycle.',
        instruction: 'Please scan a different bin.',
      },
    };
  }

  // Wrong stage — build a specific, helpful message
  const wrongStageMsg = buildWrongStageMessage(currentStatus, statusInfo, roleLabel);
  return {
    workflowState: 'WRONG_STAGE',
    currentStatusRaw: currentStatus,
    currentStatus: statusInfo.friendly,
    nextOperator: statusInfo.nextRole,
    nextOperatorFriendly: statusInfo.nextFriendly,
    currentOperator: null,
    startedAt: null,
    friendly: wrongStageMsg,
  };
}

function buildReady(binData, statusInfo, currentStatus) {
  return {
    workflowState: 'READY',
    currentStatusRaw: currentStatus,
    currentStatus: statusInfo.friendly,
    nextOperator: statusInfo.nextRole,
    nextOperatorFriendly: statusInfo.nextFriendly,
    currentOperator: getCurrentOperatorName(binData, statusInfo.nextRole),
    startedAt: getStartedAt(binData, statusInfo.nextRole),
    friendly: {
      title: 'Ready',
      message: 'This bin is ready for processing.',
      instruction: 'Proceed with the operation.',
    },
  };
}

function getCurrentOperatorId(binData, userRole) {
  if (userRole === 'Loader') return binData.Loader_User_ID || null;
  if (userRole === 'Unloader') return binData.Unloader_User_ID || null;
  if (userRole === 'Cleaner') return binData.Cleaner_User_ID || null;
  return null;
}

function getCurrentOperatorName(binData, userRole) {
  if (userRole === 'Loader') return binData.Loaded_By_Name || null;
  if (userRole === 'Unloader') return binData.Unloaded_By_Name || null;
  if (userRole === 'Cleaner') return binData.Cleaned_By_Name || null;
  return null;
}

function getStartedAt(binData, userRole) {
  if (userRole === 'Loader') return binData.Loading_Start_At || null;
  if (userRole === 'Unloader') return binData.Unloading_Start_At || null;
  if (userRole === 'Cleaner') return binData.Cleaning_Start_At || null;
  return null;
}

module.exports = { validateWorkflow, STATUS_INFO, ROLE_EXPECTED, ROLE_LABEL };
