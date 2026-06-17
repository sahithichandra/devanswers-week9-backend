import express from 'express';
import authenticate from '../middleware/authHandler.js';
import { improveQuestion, summarizeAnswers } from '../controllers/aiController.js';

const router = express.Router();

router.post('/improve-question', authenticate, improveQuestion);
router.post('/summarize-answers', authenticate, summarizeAnswers);

export default router;
