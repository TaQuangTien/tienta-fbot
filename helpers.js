import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'fb_data', 'webhook-config.json');
const logFilePath = path.join(__dirname, 'fb_data', 'logs.json');
const TMP_DIR = path.join(__dirname, 'fb_data', 'tmp');

// Đảm bảo thư mục tmp tồn tại
try {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    writeLog(`Created tmp directory: ${TMP_DIR}`);
  }
} catch (error) {
  console.error(`Error creating tmp directory: ${error.message}`);
}

// Hàm ghi log
export function writeLog(message) {
  try {
    const logEntry = { timestamp: new Date().toISOString(), message };
    let logs = getLogs();
    logs.push(logEntry);
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to write log: ${error.message}`);
  }
}

// Hàm xóa file cũ hơn 1 giờ
export async function cleanOldFiles() {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const now = Date.now();
  try {
    const files = await fs.promises.readdir(TMP_DIR);
    for (const file of files) {
      const filePath = path.join(TMP_DIR, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > ONE_HOUR_MS) {
          await fs.promises.unlink(filePath);
          writeLog(`Deleted old file: ${file}`);
        }
      } catch (error) {
        writeLog(`Error processing file ${file}: ${error.message}`);
      }
    }
  } catch (error) {
    writeLog(`Error cleaning old files: ${error.message}`);
  }
}

// Hàm tải hình ảnh từ URL
export async function downloadImageFromUrl(url, filePath) {
  try {
    return await new Promise((resolve, reject) => {
      axios.get(url, { responseType: 'stream', timeout: 10000 })
        .then((response) => {
          if (response.status !== 200) {
            return reject(new Error(`Failed to download image: HTTP ${response.status}`));
          }
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', (error) => reject(new Error(`Failed to write image: ${error.message}`)));
        })
        .catch((error) => reject(new Error(`Failed to download image from URL: ${error.message}`)));
    });
  } catch (error) {
    writeLog(`Error downloading image from URL: ${error.message}`);
    throw error;
  }
}

// Hàm chuyển base64 thành file
export async function saveBase64Image(base64Data, filePath) {
  try {
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    if (!base64String) {
      throw new Error('Invalid base64 data');
    }
    const buffer = Buffer.from(base64String, 'base64');
    await fs.promises.writeFile(filePath, buffer);
  } catch (error) {
    writeLog(`Error saving base64 image: ${error.message}`);
    throw error;
  }
}

// Hàm tạo tên file ngẫu nhiên
export function generateRandomFileName(extension) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}${extension}`;
}

export function getWebhookUrl(key) {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      return config[key] || "";
    }
    return "";
  } catch (error) {
    writeLog(`Error reading webhook config: ${error.message}`);
    return "";
  }
}

export async function triggerN8nWebhook(msg, webhookUrl) {
  if (!webhookUrl) {
    writeLog("Webhook URL is empty, skipping webhook trigger");
    return false;
  }
  try {
    writeLog(`Sending webhook to ${webhookUrl} with data: ${JSON.stringify(msg)}`);
    await axios.post(webhookUrl, msg, { headers: { 'Content-Type': 'application/json' } });
    writeLog(`Webhook ${webhookUrl} called successfully`);
    return true;
  } catch (error) {
    writeLog(`Error sending webhook to ${webhookUrl}: ${error.message}`);
    return false;
  }
}

export function getLogs() {
  try {
    if (fs.existsSync(logFilePath)) {
      const content = fs.readFileSync(logFilePath, 'utf8');
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    writeLog(`Error reading logs: ${error.message}`);
    return [];
  }
}