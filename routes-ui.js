import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fbAccounts, loginFacebookAccount } from './api/facebook/fb.js';
import { getWebhookUrl } from './helpers.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cookiesDir = path.join(__dirname, './cookies');
const configPath = path.join(__dirname, './fb_data/webhook-config.json');

// Middleware Basic Authentication
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).send('Authentication required');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const username = auth[0];
  const password = auth[1];

  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;

  if (username === envUsername && password === envPassword) {
    return next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).send('Invalid credentials');
  }
};

// Áp dụng Basic Authentication cho tất cả các route
router.use(basicAuth);

// Chuyển hướng root đến /home
router.get('/', (req, res) => {
  res.redirect('/home');
});

router.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facebook Bot - Đăng nhập</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { background-color: #f8f9fa; }
        .container { max-width: 600px; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="mb-4 text-center">Đăng nhập tài khoản Facebook</h1>
        <div class="card">
          <div class="card-body">
            <form action="/login" method="POST">
              <div class="mb-3">
                <label for="cookie" class="form-label">Cookie</label>
                <textarea class="form-control" id="cookie" name="cookie" rows="4" placeholder="Dán cookie Facebook tại đây" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Đăng nhập</button>
              <a href="/home" class="btn btn-secondary">Quay lại</a>
            </form>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

router.post('/login', async (req, res) => {
  const { cookie } = req.body;
  if (!cookie) {
    return res.status(400).send('Cookie là bắt buộc');
  }
  try {
    await loginFacebookAccount(null, cookie);
    res.redirect('/home');
  } catch (error) {
    res.status(500).send(`Lỗi đăng nhập: ${error.message}`);
  }
});

router.post('/deleteAccount', (req, res, next) => {
  const { ownId } = req.body;
  const index = fbAccounts.findIndex(acc => acc.ownId === ownId);
  if (index !== -1) {
    fbAccounts.splice(index, 1);
    const cookiePath = path.join(cookiesDir, `cred_${ownId}.json`);
    if (fs.existsSync(cookiePath)) {
      fs.unlinkSync(cookiePath);
    }
    // Gửi phản hồi với alert
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xóa tài khoản</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
        <script>
          alert('Tài khoản ${ownId} đã được xóa. Vui lòng khởi động lại Docker để áp dụng thay đổi.');
          window.location.href = '/home';
        </script>
      </body>
      </html>
    `);
    // Ném lỗi để Docker tự khởi động lại
    next(new Error('Account deleted, triggering Docker restart'));
  } else {
    res.redirect('/home');
  }
});

router.post('/restartApp', (req, res) => {
  res.redirect('/home');
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

router.get('/updateWebhookForm', (req, res) => {
  let existingConfig = { messageWebhookUrl: '', eventWebhookUrl: '' };
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    existingConfig = JSON.parse(configData);
  } catch (error) {
    console.error('Lỗi khi đọc cấu hình webhook:', error);
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facebook Bot - Cập nhật Webhook</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { background-color: #f8f9fa; }
        .container { max-width: 600px; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="mb-4 text-center">Cập nhật Webhook</h1>
        <div class="card">
          <div class="card-body">
            <form action="/updateWebhook" method="POST">
              <div class="mb-3">
                <label for="messageWebhookUrl" class="form-label">Message Webhook URL</label>
                <input type="text" class="form-control" id="messageWebhookUrl" name="messageWebhookUrl" value="${existingConfig.messageWebhookUrl || ''}" placeholder="https://example.com/webhook/message">
              </div>
              <div class="mb-3">
                <label for="eventWebhookUrl" class="form-label">Event Webhook URL</label>
                <input type="text" class="form-control" id="eventWebhookUrl" name="eventWebhookUrl" value="${existingConfig.eventWebhookUrl || ''}" placeholder="https://example.com/webhook/event">
              </div>
              <button type="submit" class="btn btn-primary">Cập nhật</button>
              <a href="/home" class="btn btn-secondary">Quay lại</a>
            </form>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

router.post('/updateWebhook', (req, res) => {
  const { messageWebhookUrl, eventWebhookUrl } = req.body;
  const config = { messageWebhookUrl, eventWebhookUrl };
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    res.redirect('/home');
  } catch (error) {
    res.status(500).send(`Lỗi khi cập nhật webhook: ${error.message}`);
  }
});

router.get('/export/account/:filename', (req, res) => {
  const filePath = path.join(cookiesDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File không tồn tại');
  }
});

router.get('/export/webhook-config', (req, res) => {
  if (fs.existsSync(configPath)) {
    res.download(configPath);
  } else {
    res.status(404).send('File webhook-config không tồn tại');
  }
});

router.post('/import', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('Không có file được tải lên');
  }
  const file = req.files.file;
  const filePath = path.join(cookiesDir, file.name);
  file.mv(filePath, (err) => {
    if (err) {
      return res.status(500).send(`Lỗi khi lưu file: ${err.message}`);
    }
    res.redirect('/home');
  });
});

router.get('/list', (req, res) => {
  res.sendFile(path.join(__dirname, './api-doc.html'));
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Lỗi khi đăng xuất');
    }
    res.redirect('/home');
  });
});

router.get('/home', (req, res) => {
  let accountsHtml = '<p class="text-muted">Chưa có tài khoản nào đăng nhập</p>';
  if (fbAccounts.length > 0) {
    accountsHtml = `
      <table class="table table-bordered table-hover">
        <thead class="table-light">
          <tr>
            <th>Account ID</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
    `;
    fbAccounts.forEach((account) => {
      accountsHtml += `
        <tr>
          <td>${account.ownId}</td>
          <td>
            <form action="/deleteAccount" method="POST" class="d-inline">
              <input type="hidden" name="ownId" value="${account.ownId}">
              <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Bạn có chắc muốn xóa tài khoản ${account.ownId}?');">Xóa</button>
            </form>
          </td>
        </tr>`;
    });
    accountsHtml += '</tbody></table>';
  }

  let webhookConfigHtml = '<p class="text-muted">Chưa có cấu hình webhook</p>';
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    webhookConfigHtml = `
      <ul class="list-group">
        <li class="list-group-item">Message Webhook: ${config.messageWebhookUrl || 'N/A'}</li>
        <li class="list-group-item">Event Webhook: ${config.eventWebhookUrl || 'N/A'}</li>
      </ul>
    `;
  } catch (error) {
    console.error('Lỗi khi đọc cấu hình webhook:', error);
  }

  let accountFilesHtml = '<p class="text-muted">Chưa có file tài khoản nào</p>';
  try {
    const cookieFiles = fs.readdirSync(cookiesDir).filter((file) => file.startsWith('cred_') && file.endsWith('.json'));
    if (cookieFiles.length > 0) {
      accountFilesHtml = `
        <ul class="list-group">
          ${cookieFiles
            .map(
              (file) => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  ${file}
                  <a href="/export/account/${file}" class="btn btn-primary btn-sm">Tải xuống</a>
                </li>`
            )
            .join('')}
        </ul>
      `;
    }
  } catch (error) {
    console.error('Lỗi khi đọc thư mục cookies:', error);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facebook Bot - Trang Quản Lý</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { background-color: #f8f9fa; }
        .card { margin-bottom: 20px; }
        .btn-custom { margin: 5px; }
      </style>
    </head>
    <body>
      <div class="container mt-4">
        <h1 class="mb-4 text-center">TienTa FB Bot - Trang Quản Lý</h1>        
        <!-- Tabs -->
        <ul class="nav nav-tabs mb-4" id="mainTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="accounts-tab" data-bs-toggle="tab" data-bs-target="#accounts" type="button" role="tab">Tài khoản</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="webhook-tab" data-bs-toggle="tab" data-bs-target="#webhook" type="button" role="tab">Webhook</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="guides-tab" data-bs-toggle="tab" data-bs-target="#guides" type="button" role="tab">Hướng dẫn</button>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/logout">Đăng xuất</a>
          </li>
        </ul>

        <!-- Tab Content -->
        <div class="tab-content" id="mainTabContent">
          <!-- Tài khoản -->
          <div class="tab-pane fade show active" id="accounts" role="tabpanel">
            <div class="card">
              <div class="card-header">
                <h5 class="card-title mb-0">Danh sách tài khoản</h5>
              </div>
              <div class="card-body">
                ${accountsHtml}
                <div class="mt-3">
                  <a href="/login" class="btn btn-primary btn-custom">Đăng nhập qua Cookie</a>
                  <form action="/restartApp" method="POST" class="d-inline">
                    <button type="submit" class="btn btn-warning btn-custom" onclick="return confirm('Bạn có chắc muốn khởi động lại ứng dụng? Trang sẽ không phản hồi trong vài giây.');">Khởi động lại ứng dụng</button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <!-- Webhook -->
          <div class="tab-pane fade" id="webhook" role="tabpanel">
            <div class="card">
              <div class="card-header">
                <h5 class="card-title mb-0">Cấu hình Webhook</h5>
              </div>
              <div class="card-body">
                ${webhookConfigHtml}
                <div class="mt-3">
                  <a href="/updateWebhookForm" class="btn btn-primary btn-custom">Cập nhật Webhook</a>
                </div>
              </div>
            </div>
          </div>
      

          <!-- Hướng dẫn -->
          <div class="tab-pane fade" id="guides" role="tabpanel">
            <div class="card">
              <div class="card-header">
                <h5 class="card-title mb-0">Lưu ý</h5>
              </div>
              <div class="card-body">
                <ul class="list-group">
                  <li class="list-group-item"><strong>Chỉ nên dùng cho tài khoản phụ</strong></li>
                  <li class="list-group-item"><strong>Giới hạn tần suất gửi tin nhắn</strong>:
                    <ul>
                      <li>Hãy như 1 người dùng bình thường, gửi spam quá bị khóa acc đó</li>
                    </ul>
                  </li>
                  <li class="list-group-item"><strong>Có thể cần phải khởi động lại Container sau khi cập nhật Webhook.</li>
                  <li class="list-group-item"><strong>Nếu bị khóa (CheckPoint) hãy login lại và lấy cookie header string mới.</li>
                </ul>
                <div class="mt-3">
                  <a href="/list" class="btn btn-primary btn-custom" target="_blank">Tài liệu API</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

export default router;
