import dotenv from 'dotenv';
import express from 'express';
import routes from './routes.js';
import fs from 'fs';
import { fbAccounts, loginFacebookAccount } from './api/facebook/fb.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fileUpload from 'express-fileupload';
import session from 'express-session';

dotenv.config();

const app = express();
const LISTEN_IP = '0.0.0.0';
const INTERNAL_PORT = 3000;

export const server = createServer(app);
export const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  ws.on('close', () => console.log('Client disconnected'));
});

wss.on('error', (error) => {
  console.error('WebSocket error:', error);
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', routes);

export function broadcastLoginSuccess(status = 'login_success') {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(status);
    }
  });
}

async function loadCookies() {
  try {
    const cookiesDir = './cookies';
    if (!fs.existsSync(cookiesDir)) {
      console.log('Cookies directory not found, skipping cookie loading');
      return;
    }

    const cookieFiles = fs.readdirSync(cookiesDir);
    if (fbAccounts.length >= cookieFiles.length) {
      console.log('No new cookies to load');
      return;
    }

    console.log('Loading cookies...');
    for (const file of cookieFiles) {
      if (file.startsWith('cred_') && file.endsWith('.json')) {
        const ownId = file.substring(5, file.length - 5);
        try {
          const cookie = fs.readFileSync(`${cookiesDir}/${file}`, 'utf-8');
          await loginFacebookAccount(null, cookie);
          console.log(`Logged in account ${ownId} from cookie.`);
        } catch (error) {
          console.error(`Error logging in account ${ownId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in loadCookies:', error);
  }
}

async function startServer() {
  try {
    await loadCookies();
    server.listen(INTERNAL_PORT, LISTEN_IP, () => {
      console.log(`Listening on port ${INTERNAL_PORT}`);
    });
    server.on('error', (error) => {
      console.error('Server error:', error);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});