import { describe, it, expect, beforeEach, vi } from 'vitest';
import { improveQuestion, summarizeAnswers } from '../../../src/controllers/aiController.js';
import * as aiService from '../../../src/services/aiService.js';

// Mock the AI service
vi.mock('../../../src/services/aiService.js');

describe('aiController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      params: {},
      body: {},
      user: { id: 'user123', isAdmin: false },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('improveQuestion', () => {
    // Success case
    it('should return improved question data with 200 status', async () => {
      // Arrange
      const bodyData = {
        title: 'How do I use JS?',
        description: 'I want to learn JS',
        tags: 'javascript',
      };
      const mockImproved = {
        title: 'How do I get started with JavaScript for beginners?',
        description: 'I am new to programming and want to learn JavaScript. Where should I begin?',
        tags: 'javascript, beginner, learning',
      };

      req.body = bodyData;
      aiService.improveQuestionService = vi.fn().mockResolvedValue(mockImproved);

      // Act
      await improveQuestion(req, res);

      // Assert
      expect(aiService.improveQuestionService).toHaveBeenCalledWith({
        title: bodyData.title,
        description: bodyData.description,
        tags: bodyData.tags,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Question improved successfully',
        data: mockImproved,
      });
    });

    // Failure case - service error propagates
    it('should propagate service errors', async () => {
      // Arrange
      req.body = { title: 'My question', description: 'Details', tags: 'js' };

      aiService.improveQuestionService = vi
        .fn()
        .mockRejectedValue(new Error('AI service unavailable'));

      // Act & Assert
      await expect(improveQuestion(req, res)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('summarizeAnswers', () => {
    // Success case
    it('should return summarized answers with 200 status', async () => {
      // Arrange
      const bodyData = {
        questionText: 'How do I use async/await in JavaScript?',
        answers: [
          'You use the async keyword before a function and await before a Promise.',
          'Async/await is syntactic sugar over Promises.',
        ],
      };
      const mockSummary =
        'Async/await allows you to write asynchronous code in a synchronous style.';

      req.body = bodyData;
      aiService.summarizeAnswersService = vi.fn().mockResolvedValue(mockSummary);

      // Act
      await summarizeAnswers(req, res);

      // Assert
      expect(aiService.summarizeAnswersService).toHaveBeenCalledWith({
        questionText: bodyData.questionText,
        answers: bodyData.answers,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Answers summarized successfully',
        data: { summary: mockSummary },
      });
    });

    // Failure case - service error propagates
    it('should propagate service errors', async () => {
      // Arrange
      req.body = {
        questionText: 'What is Node.js?',
        answers: ['A runtime environment for JavaScript.'],
      };

      aiService.summarizeAnswersService = vi
        .fn()
        .mockRejectedValue(new Error('AI service unavailable'));

      // Act & Assert
      await expect(summarizeAnswers(req, res)).rejects.toThrow('AI service unavailable');
    });
  });
});
