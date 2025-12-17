const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const QUIZ_DIR = path.join(__dirname, '..', 'assets', 'data', 'questions');

// 取得所有題庫檔案列表
function getQuizFiles() {
  const files = [];
  
  function scanDirectory(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, relativeFilePath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // 讀取檔案以取得題目數量
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const data = JSON.parse(content);
          const questionCount = data.questions?.length || 0;
          const source = data.source || entry.name;
          
          files.push({
            name: entry.name,
            path: relativeFilePath,
            fullPath: fullPath,
            questionCount: questionCount,
            source: source,
            importDate: data.importDate || new Date().toISOString().split('T')[0],
          });
        } catch (error) {
          console.error(`無法讀取檔案 ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  scanDirectory(QUIZ_DIR);
  return files;
}

// 建立 HTML 頁面
function createHTMLPage(quizFiles) {
  const fileListHTML = quizFiles.map((file, index) => `
    <div class="quiz-item">
      <div class="quiz-info">
        <h3>${file.name}</h3>
        <p class="quiz-meta">
          <span>來源：${file.source}</span><br>
          <span>題數：${file.questionCount} 題</span><br>
          <span>匯入日期：${file.importDate}</span>
        </p>
      </div>
      <a href="/download/${file.path}" class="download-btn" data-path="${file.path}">
        📥 下載題庫
      </a>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>題庫下載網站 - 測試伺服器</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .content {
      padding: 30px;
    }
    
    .quiz-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .quiz-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    
    .quiz-item:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      transform: translateY(-2px);
    }
    
    .quiz-info {
      flex: 1;
    }
    
    .quiz-info h3 {
      color: #333;
      margin-bottom: 8px;
      font-size: 18px;
    }
    
    .quiz-meta {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .quiz-meta span {
      display: inline-block;
      margin-right: 16px;
    }
    
    .download-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
      white-space: nowrap;
    }
    
    .download-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .info-box {
      background: #f5f5f5;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin-bottom: 24px;
      border-radius: 4px;
    }
    
    .info-box p {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    
    @media (max-width: 600px) {
      .quiz-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .download-btn {
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 題庫下載網站</h1>
      <p>測試伺服器 - 本地開發環境</p>
    </div>
    <div class="content">
      <div class="info-box">
        <p>
          <strong>使用說明：</strong><br>
          1. 點擊下方的「下載題庫」按鈕下載題庫 JSON 檔案<br>
          2. 在 App 中點擊「匯入題庫」按鈕<br>
          3. 輸入此伺服器的網址：<code>http://localhost:${PORT}</code><br>
          4. 選擇要下載的題庫即可匯入
        </p>
      </div>
      
      <div class="quiz-list">
        ${fileListHTML}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// 建立 HTTP 伺服器
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 首頁 - 顯示題庫列表
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const quizFiles = getQuizFiles();
      const html = createHTMLPage(quizFiles);
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`錯誤：${error.message}`);
    }
    return;
  }
  
  // 下載題庫檔案
  if (url.pathname.startsWith('/download/')) {
    const filePath = url.pathname.replace('/download/', '');
    const fullPath = path.join(QUIZ_DIR, filePath);
    
    // 安全性檢查：確保檔案在 QUIZ_DIR 目錄內
    if (!fullPath.startsWith(path.resolve(QUIZ_DIR))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('禁止訪問');
      return;
    }
    
    // 檢查檔案是否存在
    if (!fs.existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('檔案不存在');
      return;
    }
    
    try {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const fileName = path.basename(filePath);
      
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(fileContent);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`讀取檔案失敗：${error.message}`);
    }
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('找不到頁面');
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           題庫下載測試伺服器已啟動                        ║
╠══════════════════════════════════════════════════════════╣
║  伺服器網址：http://localhost:${PORT}                      ║
║  題庫目錄：${QUIZ_DIR}                                     ║
╠══════════════════════════════════════════════════════════╣
║  使用說明：                                               ║
║  1. 在瀏覽器中打開 http://localhost:${PORT}              ║
║  2. 在 App 中點擊「匯入題庫」按鈕                        ║
║  3. 輸入網址：http://localhost:${PORT}                    ║
║  4. 選擇要下載的題庫                                     ║
╠══════════════════════════════════════════════════════════╣
║  按 Ctrl+C 停止伺服器                                    ║
╚══════════════════════════════════════════════════════════╝
  `);
});

