const STATUS = {
  AWAITING_LOADING: 'Awaiting_Loading',
  LOADING_IN_PROGRESS: 'Loading_In_Progress',
  AWAITING_UNLOADING: 'Awaiting_Unloading',
  UNLOADING_IN_PROGRESS: 'Unloading_In_Progress',
  AWAITING_CLEANING: 'Awaiting_Cleaning',
  CLEANING_IN_PROGRESS: 'Cleaning_In_Progress',
  AWAITING_QA: 'Awaiting_QA',
  QA_IN_PROGRESS: 'QA_In_Progress',
  QA_PASSED: 'QA_Passed',
  QA_FAILED: 'QA_Failed',
  REINSPECTION_CLEANING: 'Reinspection_Cleaning',
  AWAITING_REINSPECTION: 'Awaiting_Reinspection',
  RETIRED: 'Retired',
};

const STATUS_LABELS = {
  [STATUS.AWAITING_LOADING]: 'Awaiting Loading',
  [STATUS.LOADING_IN_PROGRESS]: 'Loading In Progress',
  [STATUS.AWAITING_UNLOADING]: 'Awaiting Unloading',
  [STATUS.UNLOADING_IN_PROGRESS]: 'Unloading In Progress',
  [STATUS.AWAITING_CLEANING]: 'Awaiting Cleaning',
  [STATUS.CLEANING_IN_PROGRESS]: 'Cleaning In Progress',
  [STATUS.AWAITING_QA]: 'Awaiting QA',
  [STATUS.QA_IN_PROGRESS]: 'QA In Progress',
  [STATUS.QA_PASSED]: 'QA Passed',
  [STATUS.QA_FAILED]: 'QA Failed',
  [STATUS.REINSPECTION_CLEANING]: 'Reinspection Cleaning',
  [STATUS.AWAITING_REINSPECTION]: 'Awaiting Reinspection',
  [STATUS.RETIRED]: 'Retired',
};

const STATUS_CATEGORIES = {
  [STATUS.AWAITING_LOADING]: 'awaiting', [STATUS.AWAITING_UNLOADING]: 'awaiting',
  [STATUS.AWAITING_CLEANING]: 'awaiting', [STATUS.AWAITING_QA]: 'awaiting',
  [STATUS.AWAITING_REINSPECTION]: 'awaiting', [STATUS.REINSPECTION_CLEANING]: 'awaiting',
  [STATUS.LOADING_IN_PROGRESS]: 'inProgress', [STATUS.UNLOADING_IN_PROGRESS]: 'inProgress',
  [STATUS.CLEANING_IN_PROGRESS]: 'inProgress', [STATUS.QA_IN_PROGRESS]: 'inProgress',
  [STATUS.QA_PASSED]: 'passed', [STATUS.QA_FAILED]: 'failed', [STATUS.RETIRED]: 'retired',
};

export { STATUS, STATUS_LABELS, STATUS_CATEGORIES };
export default STATUS;