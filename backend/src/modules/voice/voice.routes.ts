import { Router, Request, Response } from 'express';
import { authenticate, authorize, asyncHandler } from '../../common/middleware';
import { VoiceService } from './voice.service';

const router = Router();
const voiceService = new VoiceService();

// POST /api/voice/transcript - Process voice input from client
router.post('/transcript', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { transcript, language } = req.body;
  if (!transcript?.trim()) {
    return res.status(400).json({ success: false, message: 'Transcript is required' });
  }

  const result = await voiceService.processVoiceInput(transcript, language);
  res.json({ success: true, data: result });
}));

// POST /api/voice/tts - Generate speech hints for client-side TTS
router.post('/tts', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { text, options } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ success: false, message: 'Text is required' });
  }

  const result = voiceService.generateSpeechHints(text, options);
  res.json({ success: true, data: result });
}));

// POST /api/voice/split - Split text into speakable chunks
router.post('/split', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ success: false, message: 'Text is required' });
  }

  const chunks = voiceService.splitIntoSentences(text);
  res.json({ success: true, data: { chunks, count: chunks.length } });
}));

// GET /api/voice/config - Get voice configuration (admin)
router.get('/config', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (_req: Request, res: Response) => {
  const config = await voiceService.getDefaultConfig();
  res.json({ success: true, data: config });
}));

export default router;