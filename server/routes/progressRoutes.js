const express = require('express');
const router = express.Router();
const {
  completeOnboarding,
  updateMemorized,
  resetProgress,
  getTodayTasks,
  markPageComplete,
  unmarkPageComplete,
  getAllProgress,
  getJuzProgress,
  getEstimate,
  getWeekPlan,
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/onboarding', completeOnboarding);

router.put('/memorized', updateMemorized);

router.delete('/reset', resetProgress);

router.get('/today', getTodayTasks);

router.post('/complete', markPageComplete);

router.post('/uncomplete', unmarkPageComplete);

router.get('/all', getAllProgress);

router.get('/juz', getJuzProgress);

router.get('/estimate', getEstimate);

router.get('/week', getWeekPlan);

module.exports = router;