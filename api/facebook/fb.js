import wiegine from 'ws3-fca';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { setupEventListeners, writeLog } from '../../eventListeners.js';
import { cleanOldFiles, downloadImageFromUrl, saveBase64Image, generateRandomFileName } from '../../helpers.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __selfListen = process.env.SELF_LISTEN;

export const fbAccounts = [];

export async function loginFacebookAccount(proxy, cookie) {
  
  return new Promise((resolve, reject) => {
    wiegine.login(cookie, { selfListen: __selfListen, listenEvents: true }, (err, api) => {
      if (err) {
        console.error('Login error:', err);
        writeLog(`Login error: ${err.message}`);
        return reject(err);
      }

      if (!api || typeof api.getCurrentUserID !== 'function') {
        const error = new Error('Failed to initialize API or getCurrentUserID is not available');
        console.error('Login error:', error);
        writeLog(`Login error: ${error.message}`);
        return reject(error);
      }

      const ownId = api.getCurrentUserID();
      if (!ownId) {
        const error = new Error('Failed to retrieve user ID');
        console.error('Login error:', error);
        writeLog(`Login error: ${error.message}`);
        return reject(error);
      }

      setupEventListeners(api, () => resolve('login_success'));

      const existingAccountIndex = fbAccounts.findIndex(acc => acc.ownId === ownId);
      if (existingAccountIndex !== -1) {
        fbAccounts[existingAccountIndex] = { api, ownId, userId: ownId, lastAPIMessage: "" };
      } else {
        fbAccounts.push({ api, ownId, userId: ownId, Proxy: null, lastAPIMessage: "" });
      }

      const cookiesDir = path.join(__dirname, '../../cookies');
      if (!fs.existsSync(cookiesDir)) {
        fs.mkdirSync(cookiesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(cookiesDir, `cred_${ownId}.json`), cookie);
      console.log(`Logged in ${ownId}`);
      writeLog(`Logged in ${ownId}`);
    });
  });
}

export async function sendMessage(req, res) {
  const { message, threadId, ownId } = req.body;
  if (!message || !threadId || !ownId) {
    return { success: false, error: 'Invalid data' };
  }
  const account = fbAccounts.find(acc => acc.ownId === ownId);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  try {
    const result = await account.api.sendMessage(message, threadId);
    account.lastAPIMessage = message;
    console.log('SetLastMessage:', message);
    writeLog(`Sent message: ${message} to ${threadId}`);
    return { success: true, data: result };
  } catch (error) {
    writeLog(`Error sending message: ${error.message}`);
    throw error;
  }
}


////Send Image
export async function sendImageToUser(req, res) {
  const { imagePath, imageUrl, base64Image, threadId, ownId } = req.body;

  if (!threadId || !ownId || (!imagePath && !imageUrl && !base64Image)) {
    return { success: false, error: 'Invalid data: imagePath, imageUrl, or base64Image and threadId, ownId are required' };
  }

  const account = fbAccounts.find(acc => acc.ownId === ownId);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }

  let finalImagePath = imagePath;

  try {
    await cleanOldFiles();

    if (imageUrl || base64Image) {
      let fileExtension = '.png';
      if (imageUrl) {
        try {
          fileExtension = path.extname(new URL(imageUrl).pathname) || '.png';
        } catch (error) {
          writeLog(`Invalid URL: ${imageUrl}, error: ${error.message}`);
          return { success: false, error: 'Invalid image URL' };
        }
      }
      const fileName = generateRandomFileName(fileExtension);
      finalImagePath = path.join('/app', 'fb_data', 'tmp', fileName);

      if (imageUrl) {
        await downloadImageFromUrl(imageUrl, finalImagePath);
        writeLog(`Downloaded image from URL to ${finalImagePath}`);
      } else if (base64Image) {
        await saveBase64Image(base64Image, finalImagePath);
        writeLog(`Saved base64 image to ${finalImagePath}`);
      }
    }

    if (!fs.existsSync(finalImagePath)) {
      writeLog(`Image file does not exist: ${finalImagePath}`);
      return { success: false, error: 'Image file does not exist' };
    }

    const msg = { body: "", attachment: fs.createReadStream(finalImagePath) };
    const result = await account.api.sendMessage(msg, threadId);
    writeLog(`Sent image to ${threadId}`);
    return { success: true, data: result };
  } catch (error) {
    writeLog(`Error sending image: ${error.message}`);
    throw error;
  }
}

export async function sendImagesToUser(req, res) {
  const { imagePaths, imageUrls, base64Images, threadId, ownId } = req.body;

  if (!threadId || !ownId || (!imagePaths && !imageUrls && !base64Images) ||
      (imagePaths && (!Array.isArray(imagePaths) || imagePaths.length === 0)) ||
      (imageUrls && (!Array.isArray(imageUrls) || imageUrls.length === 0)) ||
      (base64Images && (!Array.isArray(base64Images) || base64Images.length === 0))) {
    return { success: false, error: 'Invalid data: imagePaths, imageUrls, or base64Images must be a non-empty array and threadId, ownId are required' };
  }

  const account = fbAccounts.find(acc => acc.ownId === ownId);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }

  const finalImagePaths = imagePaths || [];
  try {
    await cleanOldFiles();

    if (imageUrls && Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        let fileExtension = '.png';
        try {
          fileExtension = path.extname(new URL(url).pathname) || '.png';
        } catch (error) {
          writeLog(`Invalid URL: ${url}, error: ${error.message}`);
          continue;
        }
        const fileName = generateRandomFileName(fileExtension);
        const filePath = path.join('/app', 'fb_data', 'tmp', fileName);
        await downloadImageFromUrl(url, filePath);
        writeLog(`Downloaded image from URL to ${filePath}`);
        finalImagePaths.push(filePath);
      }
    }

    if (base64Images && Array.isArray(base64Images)) {
      for (const base64Image of base64Images) {
        const fileName = generateRandomFileName('.png');
        const filePath = path.join(__dirname, 'fb_data', 'tmp', fileName);
        await saveBase64Image(base64Image, filePath);
        writeLog(`Saved base64 image to ${filePath}`);
        finalImagePaths.push(filePath);
      }
    }

    if (finalImagePaths.length === 0) {
      writeLog('No valid images to send');
      return { success: false, error: 'No valid images to send' };
    }

    const attachments = finalImagePaths.map(path => fs.createReadStream(path));
    const msg = { body: "", attachment: attachments };
    const result = await account.api.sendMessage(msg, threadId);
    writeLog(`Sent ${finalImagePaths.length} images to ${threadId}`);
    return { success: true, data: result };
  } catch (error) {
    writeLog(`Error sending images: ${error.message}`);
    throw error;
  }
}
//// End of Send image
export async function getUserInfo(api, userId) {
  return new Promise((resolve, reject) => {
    api.getUserInfo(userId, (err, info) => {
      if (err) {
        writeLog(`Error getting user info: ${err.message}`);
        return reject(err);
      }
      writeLog(`Fetched user info for IDs: ${userId}`);
      resolve(info);
    });
  });
}

export async function getUserID(api, name) {
  return new Promise((resolve, reject) => {
    api.getUserID(name, (err, data) => {
      if (err) {
        writeLog(`Error getting user ID for name: ${name}, error: ${err.message}`);
        return reject(err);
      }
      writeLog(`Fetched user ID for name: ${name}`);
      resolve(data);
    });
  });
}

export async function getThreadInfo(api, threadId) {
  return new Promise((resolve, reject) => {
    api.getThreadInfo(threadId, (err, info) => {
      if (err) {
        writeLog(`Error getting thread info for threadID: ${threadId}, error: ${err.message}`);
        return reject(err);
      }
      writeLog(`Fetched thread info for threadID: ${threadId}`);
      resolve(info);
    });
  });
}
