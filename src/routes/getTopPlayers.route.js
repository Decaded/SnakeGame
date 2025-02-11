const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const scores = db.get('scores') || {};
    const topPlayers = Object.entries(scores)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 10)
      .map(([nick, data]) => ({
        nick: sanitizeHtml(nick),
        score: data.score
      }));

    res.json(topPlayers);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard'
    });
  }
});

module.exports = router;
