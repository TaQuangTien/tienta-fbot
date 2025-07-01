import express from 'express';
import { apiKeyAuth } from './middleware.js';
import { sendMessage, sendImageToUser, sendImagesToUser, getUserInfo, getUserID, getThreadInfo } from './fbService.js';
import { fbAccounts } from './api/facebook/fb.js';

const router = express.Router();

router.use(apiKeyAuth);

router.get('/accounts', (req, res) => {
  const accounts = fbAccounts.map(acc => ({
    ownId: acc.ownId,
    userId: acc.userId || 'N/A'
  }));
  res.json({ success: true, data: accounts });
});

router.post('/sendMessage', async (req, res) => {
  try {
    const result = await sendMessage(req, res);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sendImageToUser', async (req, res) => {
  try {
    const result = await sendImageToUser(req, res);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sendImagesToUser', async (req, res) => {
  try {
    const result = await sendImagesToUser(req, res);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/userInfo', async (req, res) => {
  const { userId, ownId } = req.query;
  if (!userId || !ownId) {
    return res.status(400).json({ success: false, error: 'userId and ownId are required' });
  }
  const account = fbAccounts.find(acc => acc.ownId === ownId);
  if (!account) {
    return res.status(404).json({ success: false, error: 'Account not found' });
  }
  try {
    const result = await getUserInfo(account.api, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/userId', async (req, res) => {
  const { name, ownId } = req.query;
  if (!name || !ownId) {
    return res.status(400).json({ success: false, error: 'name and ownId are required' });
  }
  const account = fbAccounts.find(acc => acc.ownId === ownId);
  if (!account) {
    return res.status(404).json({ success: false, error: 'Account not found' });
  }
  try {
    const result = await getUserID(account.api, name);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/threadInfo', async (req, res) => {
  const { threadId, ownId } = req.query;
  if (!threadId || !ownId) {
    return res.status(400).json({ success: false, error: 'threadId and ownId are required' });
  }
  const account = fbAccounts.find(acc => acc.ownId === ownId);
  if (!account) {
    return res.status(404).json({ success: false, error: 'Account not found' });
  }
  try {
    const result = await getThreadInfo(account.api, threadId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;