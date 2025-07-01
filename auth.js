import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFilePath = path.join(__dirname, 'fb_data', 'users.json');

const initUserFile = () => {
  if (!fs.existsSync(path.join(__dirname, 'fb_data'))) {
    fs.mkdirSync(path.join(__dirname, 'fb_data'), { recursive: true });
  }
  
  if (!fs.existsSync(userFilePath)) {
    const defaultPassword = 'admin';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(defaultPassword, salt, 1000, 64, 'sha512').toString('hex');
    
    const users = [{
      username: 'admin',
      salt,
      hash
    }];
    
    fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));
    console.log('Created users.json with default account: admin/admin');
  }
};

initUserFile();

const getUsers = () => {
  try {
    const data = fs.readFileSync(userFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users.json:', error);
    return [];
  }
};

export const addUser = (username, password) => {
  const users = getUsers();
  if (users.some(user => user.username === username)) {
    return false;
  }
  
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  
  users.push({ username, salt, hash });
  fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));
  return true;
};

export const validateUser = (username, password) => {
  const users = getUsers();
  const user = users.find(user => user.username === username);
  
  if (!user) {
    return false;
  }
  
  const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
  return user.hash === hash;
};

export const authMiddleware = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/admin-login');
};

export const publicRoutes = [
  '/admin-login',
  '/api/accounts',
  '/api/sendMessage',
  '/api/sendImageToUser',
  '/api/sendImagesToUser',
  '/login'
];