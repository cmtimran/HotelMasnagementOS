import { Router } from 'express';
import { guestCxController } from '../controllers/guestCx.controller.js';

const router = Router();

// 1. Meta WhatsApp Webhook endpoints (Public - Verified via Meta challenge & HMAC signature)
router.get('/webhook', guestCxController.handleWebhookGet);
router.post('/webhook', guestCxController.handleWebhookPost);

// 2. Guest-Facing Pre-Arrival KYC & Digital Fast-Pass (Public - Verified via HMAC token)
router.get('/express-checkin-details', guestCxController.getExpressCheckinDetails);
router.post('/express-checkin/submit', guestCxController.submitExpressCheckin);

// 3. Staff & Front Desk Inbox Management endpoints
router.get('/conversations', guestCxController.getConversations);
router.get('/conversations/:id/messages', guestCxController.getMessages);
router.post('/conversations/messages', guestCxController.sendMessage);
router.post('/conversations/approve-reply', guestCxController.approveDraftReply);
router.post('/conversations/ai-mode', guestCxController.updateAiMode);
router.post('/conversations/takeover', guestCxController.takeoverConversation);
router.post('/conversations/resume-ai', guestCxController.resumeAi);

// 4. Multi-Channel Social & Messaging Connected Accounts (WhatsApp, FB, IG)
router.get('/accounts', guestCxController.getConnectedAccounts);
router.post('/accounts', guestCxController.createConnectedAccount);
router.delete('/accounts/:id', guestCxController.deleteConnectedAccount);

// 5. Pre-Checkin Link Generation & Front Desk Ops
router.post('/pre-checkin/generate', guestCxController.generatePreCheckinLink);
router.post('/luggage-stored', guestCxController.markLuggageStoredEarly);
router.post('/room-ready-alert', guestCxController.triggerRoomReadyAlert);
router.post('/dispatch-service-task', guestCxController.dispatchServiceTask);

// 6. Local Omnichannel AI Simulator (Test without Meta hosting)
router.post('/simulate', guestCxController.simulateInboundMessage);

// 7. GuestFlow AI Courtesy Hold & Auto-Cancel Settings
router.get('/settings', guestCxController.getCxSettings);
router.post('/settings', guestCxController.updateCxSettings);
router.post('/process-holds', guestCxController.triggerHoldLifecycle);

// 8. AI Copilot Guest 360 & Memory Intelligence (AiPraktor Standard)
router.get('/copilot/:conversationId', guestCxController.getCopilotSummary);
router.post('/copilot/ask', guestCxController.askCopilot);

export default router;
