const ROLES = { ADMINISTRATOR: 'Administrator', LOADER: 'Loader', UNLOADER: 'Unloader', CLEANER: 'Cleaner', QA_INSPECTOR: 'QA_Inspector' };
const ROLE_LABELS = { [ROLES.ADMINISTRATOR]: 'Administrator', [ROLES.LOADER]: 'Loader', [ROLES.UNLOADER]: 'Unloader', [ROLES.CLEANER]: 'Cleaner', [ROLES.QA_INSPECTOR]: 'QA Inspector' };
const ROLE_OPTIONS = Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] }));
export { ROLES, ROLE_LABELS, ROLE_OPTIONS };
export default ROLES;