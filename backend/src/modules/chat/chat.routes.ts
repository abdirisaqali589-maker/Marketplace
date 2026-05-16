import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import * as chatController from './chat.controller';
import { sendAIMessage, generateTitle, sendAIStreamMessage } from './ai-chat.controller';

const router = Router();

router.use(authenticate);

router.get('/conversations', chatController.listConversations);
router.post('/conversations', chatController.createConversation);
router.get('/conversations/:id', chatController.getConversation);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.post('/conversations/:id/ai', sendAIMessage);
router.get('/conversations/:id/ai/stream', sendAIStreamMessage);
// POST-based streaming endpoint (recommended — avoids URL length limits and is more secure)
router.post('/conversations/:id/ai/stream', sendAIStreamMessage);
router.post('/conversations/:id/generate-title', generateTitle);
router.get('/conversations/:id/messages', chatController.listMessages);
router.patch('/conversations/:id/archive', chatController.archiveConversation);

export default router;
