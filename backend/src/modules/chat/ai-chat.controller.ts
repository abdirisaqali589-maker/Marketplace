import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { AIChatService } from './ai-chat.service';
import { logger } from '../../common/logger';

const aiChatService = new AIChatService();

export const sendAIMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const { id: conversationId } = req.params;
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'message is required' });
  }
  const result = await aiChatService.sendAIMessage(conversationId, userId, message);
  res.json({
    success: true,
    message: result.toolResults?.length ? 'AI response completed with tool data' : 'AI response completed',
    data: result.message,
    usage: result.usage,
    toolResults: result.toolResults || [],
  });
});

export const sendAIStreamMessage = asyncHandler(async (req: Request, res: Response) => {
   const userId = (req as any).user?.userId;
   if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

   const { id: conversationId } = req.params;
   // Support both GET query param and POST body for message
   const message = (req.method === 'POST' ? (req.body?.message as string) : (req.query.message as string)) || '';
   if (!message.trim()) {
     return res.status(400).json({ success: false, message: 'message is required' });
   }

   // For POST requests, return JSON instead of SSE
   if (req.method === 'POST') {
     try {
       let fullContent = '';
       let fullThinking = '';

       await aiChatService.sendAIStreamMessage(conversationId, userId, message, {
         onThinking: (text) => { fullThinking += text; },
         onContent: (text) => { fullContent += text; },
         onDone: (result) => {
           res.json({
             success: true,
             message: 'AI response completed',
             data: {
               content: result.content || fullContent,
               thinking: result.thinking || fullThinking,
               model: result.model,
               tokens: result.tokens,
               finish_reason: 'stop',
             },
           });
         },
         onError: (error) => {
           logger.error('Stream error', { error });
           res.status(502).json({ success: false, error });
         },
       });
     } catch (err: any) {
       logger.error('Stream initialization failed', { error: err.message });
       res.status(502).json({ success: false, error: err.message || 'Stream failed' });
     }
     return;
   }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    let accumulatedThinking = '';
    let accumulatedContent = '';

    await aiChatService.sendAIStreamMessage(conversationId, userId, message, {
      onThinking: (text: string) => {
        // Handle both incremental and full thinking updates
        if (text.length > accumulatedThinking.length) {
          const delta = text.slice(accumulatedThinking.length);
          accumulatedThinking = text;
          res.write(`data: ${JSON.stringify({ thinking: delta, fullThinking: text, type: 'thinking' })}\n\n`);
        } else if (text !== accumulatedThinking) {
          // Full replacement (rare case)
          accumulatedThinking = text;
          res.write(`data: ${JSON.stringify({ thinking: text, fullThinking: text, type: 'thinking' })}\n\n`);
        }
      },
      onContent: (text: string) => {
        accumulatedContent += text;
        res.write(`data: ${JSON.stringify({ content: text, type: 'content' })}\n\n`);
      },
      onDone: (result: { content: string; thinking: string; model?: string; tokens?: number }) => {
        res.write(`data: ${JSON.stringify({
          done: true,
          type: 'done',
          fullContent: result.content,
          fullThinking: result.thinking,
          model: result.model,
          tokens: result.tokens,
          finish_reason: 'stop',
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      },
      onError: (error: string) => {
        logger.error('Stream error', { error });
        res.write(`data: ${JSON.stringify({ error, type: 'error' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });
  } catch (err: any) {
    logger.error('Stream initialization failed', { error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream failed', type: 'error' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export const generateTitle = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const { firstMessage } = req.body;

  if (!firstMessage?.trim()) {
    return res.status(400).json({ success: false, message: 'firstMessage is required' });
  }

  const title = await aiChatService.generateChatTitle(firstMessage);
  res.json({ success: true, data: { title } });
});
