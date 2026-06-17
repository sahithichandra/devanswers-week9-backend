import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  improveQuestionService,
  summarizeAnswersService,
} from '../../../src/services/aiService.js';
import { GoogleGenAI } from '@google/genai';

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
}));

describe('aiService', () => {
  let mockGenerateContent;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-instantiate to get a fresh mock instance reference after clearAllMocks
    // GoogleGenAI is called inside each service function, so we reset the constructor mock
    // and grab the generateContent spy from the first created instance in each test
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));
    mockGenerateContent = vi.fn();
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));
  });

  describe('improveQuestionService', () => {
    // Success case
    it('should return parsed JSON with improved title, description, and tags', async () => {
      // Arrange
      const input = {
        title: 'How do I use JS?',
        description: 'I want to learn JS',
        tags: 'javascript',
      };
      const responseJson = {
        title: 'How do I get started with JavaScript for beginners?',
        description: 'I am new to programming and want to learn JavaScript. Where should I begin?',
        tags: 'javascript, beginner, learning',
      };

      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(responseJson) });

      // Act
      const result = await improveQuestionService(input);

      // Assert
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.5-flash-lite' })
      );
      expect(result).toEqual(responseJson);
    });

    // Strip asterisks from returned fields
    it('should strip asterisks from title, description, and tags', async () => {
      // Arrange
      const input = {
        title: 'How do I use JS?',
        description: 'I want to learn JS',
        tags: 'javascript',
      };
      const responseJson = {
        title: '**Improved** title here',
        description: 'Some **bold** description text',
        tags: '**javascript**, nodejs',
      };

      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(responseJson) });

      // Act
      const result = await improveQuestionService(input);

      // Assert
      expect(result.title).toBe('Improved title here');
      expect(result.description).toBe('Some bold description text');
      expect(result.tags).toBe('javascript, nodejs');
    });

    // Handle markdown code fences
    it('should handle response wrapped in markdown json code fences', async () => {
      // Arrange
      const input = {
        title: 'My question',
        description: 'My description',
        tags: 'js',
      };
      const responseJson = {
        title: 'Improved title',
        description: 'Improved description',
        tags: 'javascript',
      };
      const fencedText = '```json\n' + JSON.stringify(responseJson) + '\n```';

      mockGenerateContent.mockResolvedValue({ text: fencedText });

      // Act
      const result = await improveQuestionService(input);

      // Assert
      expect(result).toEqual(responseJson);
    });

    // Handle plain code fences (no language specifier)
    it('should handle response wrapped in plain code fences', async () => {
      // Arrange
      const input = {
        title: 'My question',
        description: 'My description',
        tags: 'js',
      };
      const responseJson = {
        title: 'Improved title',
        description: 'Improved description',
        tags: 'javascript',
      };
      const fencedText = '```\n' + JSON.stringify(responseJson) + '\n```';

      mockGenerateContent.mockResolvedValue({ text: fencedText });

      // Act
      const result = await improveQuestionService(input);

      // Assert
      expect(result).toEqual(responseJson);
    });

    // Failure case - non-retriable error propagates immediately
    it('should propagate non-retriable error from generateContent', async () => {
      // Arrange
      const input = {
        title: 'My question',
        description: 'My description',
        tags: 'js',
      };

      mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));

      // Act & Assert
      await expect(improveQuestionService(input)).rejects.toThrow('Gemini API error');
    });

    // Fallback chain: rate-limit on primary triggers fallback model
    it('should fall back to next model on retriable 429 error', async () => {
      vi.useFakeTimers();

      // Arrange
      const input = { title: 'test', description: 'test', tags: 'test' };
      const responseJson = { title: 'Improved', description: 'Improved desc', tags: 'tag' };
      const rateLimitErr = new Error('429 quota exceeded');

      // First three calls (primary model, 3 attempts) fail with 429; 4th (fallback model) succeeds
      mockGenerateContent
        .mockRejectedValueOnce(rateLimitErr)
        .mockRejectedValueOnce(rateLimitErr)
        .mockRejectedValueOnce(rateLimitErr)
        .mockResolvedValue({ text: JSON.stringify(responseJson) });

      // Act — advance timers concurrently to skip sleep() delays
      const resultPromise = improveQuestionService(input);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      vi.useRealTimers();

      // Assert — eventually succeeded via fallback model
      expect(result).toEqual(responseJson);
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });
  });

  describe('summarizeAnswersService', () => {
    // Success case
    it('should return trimmed plain text summary', async () => {
      // Arrange
      const input = {
        questionText: 'How do I use async/await in JavaScript?',
        answers: [
          'You use the async keyword before a function and await before a Promise.',
          'Async/await is syntactic sugar over Promises.',
        ],
      };
      const rawSummary = '  Async/await allows writing asynchronous code in a synchronous style.  ';

      mockGenerateContent.mockResolvedValue({ text: rawSummary });

      // Act
      const result = await summarizeAnswersService(input);

      // Assert
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.5-flash-lite' })
      );
      expect(result).toBe('Async/await allows writing asynchronous code in a synchronous style.');
    });

    // Strip asterisks from response text
    it('should strip asterisks from the response text', async () => {
      // Arrange
      const input = {
        questionText: 'What is Node.js?',
        answers: ['Node.js is a JavaScript runtime.'],
      };
      const rawSummary = 'Node.js is a **JavaScript** runtime built on **Chrome V8**.';

      mockGenerateContent.mockResolvedValue({ text: rawSummary });

      // Act
      const result = await summarizeAnswersService(input);

      // Assert
      expect(result).toBe('Node.js is a JavaScript runtime built on Chrome V8.');
    });

    // Failure case - generateContent throws
    it('should propagate error from generateContent', async () => {
      // Arrange
      const input = {
        questionText: 'What is Node.js?',
        answers: ['Node.js is a JavaScript runtime.'],
      };

      mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));

      // Act & Assert
      await expect(summarizeAnswersService(input)).rejects.toThrow('Gemini API error');
    });
  });
});
