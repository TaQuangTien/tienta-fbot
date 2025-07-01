import { triggerN8nWebhook, getWebhookUrl } from './helpers.js';
import { fbAccounts } from './api/facebook/fb.js';
import { broadcastLoginSuccess } from './server.js';
import fs from 'fs';

const logFilePath = './fb_data/logs.json';
const MAX_LOG_LINES = 10000;
let logs = [];

export const writeLog = (message) => {
  logs.push({ timestamp: new Date().toISOString(), message });
  if (logs.length > MAX_LOG_LINES) {
    logs.shift();
  }
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing log:', error);
  }
};

export const clearLogs = () => {
  logs = [];
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
};

export function setupEventListeners(api, loginResolve) {
  try {
    // Thiết lập tùy chọn cho API
    api.setOptions({ selfListen: true, listenEvents: false });

    // Kiểm tra xem api.listenMqtt có tồn tại không
    if (typeof api.listenMqtt !== 'function') {
      const errorMessage = 'api.listenMqtt is not a function';
      console.error(errorMessage);
      writeLog(errorMessage);
      loginResolve('login_success');
      return;
    }

    // Lắng nghe sự kiện qua listenMqtt
    api.listenMqtt((err, event) => {
      if (err) {
        const errorMessage = `MQTT Error: ${err.message}`;
        console.error(errorMessage);
        writeLog(errorMessage);
        if (err.message.includes('Checkpoint Detected') || err.message.includes('Account Suspended')) {
          broadcastLoginSuccess('login_failed');
        }
        return;
      }

      const webhookUrl = getWebhookUrl('messageWebhookUrl');
      if (webhookUrl && event.type === 'message') {
        const ownId = api.getCurrentUserID();
        const _isAPI = fbAccounts.some(acc => acc.ownId === ownId && acc.lastAPIMessage === event.body);
        triggerN8nWebhook({ ...event, AccountID: ownId, isAPI: _isAPI  }, webhookUrl);
        writeLog(`Message Event: ${JSON.stringify(event)}`);        
      }
    });

    console.log('Connected to Facebook Messenger');
    writeLog('Connected to Facebook Messenger');
    loginResolve('login_success');
  } catch (error) {
    console.error('Error in setupEventListeners:', error);
    writeLog(`Error in setupEventListeners: ${error.message}`);
    loginResolve('login_success'); // Vẫn resolve để tiếp tục
  }
}