const { body, validationResult } = require('express-validator');

module.exports.validateScore = [
  body('nick')
    .trim()
    .isLength({ min: 3, max: 16 })
    .matches(/^[\p{L}\p{N}_-]+$/u)
    .withMessage('Nickname must be 3-16 characters and may include letters, numbers, underscores, and hyphens'),
  body('score').isInt({ min: 0, max: 9_999_999 }).withMessage('Invalid score value'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    next();
  },
];
