import { improveQuestionService, summarizeAnswersService } from '../services/aiService.js';

export const improveQuestion = async (req, res, next) => {
  try {
    const { title, description, tags } = req.body;
    const improved = await improveQuestionService({ title, description, tags });
    res.status(200).json({
      success: true,
      message: 'Question improved successfully',
      data: improved,
    });
  } catch (error) {
    next(error);
  }
};

export const summarizeAnswers = async (req, res, next) => {
  try {
    const { questionText, answers } = req.body;
    const summary = await summarizeAnswersService({ questionText, answers });
    res.status(200).json({
      success: true,
      message: 'Answers summarized successfully',
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
};
