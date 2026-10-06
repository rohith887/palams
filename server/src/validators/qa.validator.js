const { body } = require('express-validator');

const startQAValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
];

const completeQAValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('visual').optional({ nullable: true }).isIn(['Pass', 'Fail']).withMessage('Visual inspection result is required'),
  body('visualNotes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('residue').optional({ nullable: true }).isIn(['Pass', 'Fail']).withMessage('Residue check result is required'),
  body('residueNotes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('damage').optional({ nullable: true }).isIn(['Pass', 'Fail']).withMessage('Damage assessment result is required'),
  body('damageNotes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('odor').optional({ nullable: true }).isIn(['Pass', 'Fail']).withMessage('Odor check result is required'),
  body('odorNotes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('label').optional({ nullable: true }).isIn(['Pass', 'Fail']).withMessage('Label integrity result is required'),
  body('labelNotes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('seal').optional({ nullable: true }).isIn(['Pass', 'Fail']).withMessage('Seal integrity result is required'),
  body('sealNotes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('overallResult').isIn(['PASS', 'FAIL']).withMessage('Overall result is required'),
  body('failureReason').if(body('overallResult').equals('FAIL'))
    .notEmpty().isString().isLength({ min: 20, max: 1000 })
    .withMessage('Failure reason is required (minimum 20 characters) when QA fails'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
  body('comments').optional({ nullable: true }).isString().isLength({ max: 500 }),
];

module.exports = { startQAValidation, completeQAValidation };