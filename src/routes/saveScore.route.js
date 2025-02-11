const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const db = require('../db');
const { validateScore } = require('../middlewares/validation');

router.post('/', validateScore, async (req, res) => {
  try {
    const { nick, score, token } = req.body;
    const sanitizedNick = sanitizeHtml(nick);
    const scores = db.get('scores') || {};
    const record = scores[sanitizedNick];

    if (!record || record.token !== token) {
      return res.status(403).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    let newHighScore = false;
    if (score > record.score) {
      scores[sanitizedNick].score = score;
      db.set('scores', scores);
      newHighScore = true;
    }

    res.json({
      success: true,
      currentScore: Math.max(record.score, score),
      newHighScore
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
