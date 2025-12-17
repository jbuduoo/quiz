const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const imagesDir = path.join(__dirname, '..', 'assets', 'images');

// 遞迴找出所有 JSON 檔案
function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findJsonFiles(filePath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 檢查圖片檔案是否存在
function checkImageExists(imagePath) {
  const fullPath = path.join(__dirname, '..', imagePath);
  return fs.existsSync(fullPath);
}

// 從文字中提取圖片引用（@@圖片名稱@@ 格式，或單純的 @@ 佔位符）
function extractImageReferences(text) {
  const matches = [];
  // 匹配 @@內容@@ 或 @@（空內容）
  const regex = /@@([^@]*)@@/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const content = match[1].trim();
    // 如果內容為空或只包含空白，這是合法的佔位符
    // 如果內容包含文字，可能是圖片檔名或錯誤格式
    matches.push(content);
  }
  
  return matches;
}

// 驗證單個檔案
function validateFile(filePath) {
  const errors = [];
  const warnings = [];
  const imageReferences = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // 檢查基本結構
    if (!data.questions || !Array.isArray(data.questions)) {
      errors.push('缺少 questions 陣列');
      return { errors, warnings, imageReferences };
    }
    
    // 解析檔案路徑以獲取 testName, subject, series_no
    const relativePath = path.relative(questionsDir, filePath);
    const pathParts = relativePath.split(path.sep);
    const testName = pathParts[0];
    const subject = pathParts[1];
    const series_no = pathParts[2] ? pathParts[2].replace('.json', '') : null;
    
    // 檢查每個題目
    data.questions.forEach((q, index) => {
      const questionNum = index + 1;
      
      // 檢查必要欄位（支援新舊格式）
      const hasId = q.Id || q.id;
      const hasQ = q.Q || q.content;
      const hasExp = q.Exp || q.exp;
      
      if (!hasId || !hasQ || !q.A || !q.B || !q.C || !q.D || !q.Ans || !hasExp) {
        errors.push(`題目 ${questionNum}: 缺少必要欄位`);
      }
      
      // 檢查圖片引用
      const allText = [
        q.Q || q.content || '',
        q.A || '',
        q.B || '',
        q.C || '',
        q.D || '',
        q.Exp || q.exp || ''
      ].join(' ');
      
      const images = extractImageReferences(allText);
      
      if (images.length > 0) {
        images.forEach(imgRef => {
          // 嘗試推斷圖片檔名（格式：{題號}Q{序號}.png 或 {題號}{選項}{序號}.png）
          const imageInfo = {
            questionNum,
            reference: imgRef,
            filePath: filePath,
            testName,
            subject,
            series_no
          };
          
          // 如果是空的 @@ 標記，這是合法的佔位符格式，應用程式會自動推斷圖片檔名
          // 檢查是否為純佔位符（空內容或只包含空白、標點符號）
          const trimmedRef = imgRef.trim();
          const isPlaceholder = trimmedRef === '' || 
                               trimmedRef.startsWith('##') || 
                               /^\s*$/.test(trimmedRef);
          
          if (isPlaceholder) {
            // 這是合法的 @@ 佔位符格式，不需要警告
            imageInfo.isPlaceholder = true;
          } else {
            // 檢查是否為推斷的圖片檔名格式
            const inferredPattern = /^(\d+)([QABCD])(\d+)\.png$/i;
            const match = imgRef.match(inferredPattern);
            
            if (match) {
              const [, qNum, type, seq] = match;
              const imageFileName = `${qNum}${type}${seq}.png`;
              const imagePath = `assets/images/${testName}/${subject}/${series_no}/${imageFileName}`;
              
              if (!checkImageExists(imagePath)) {
                warnings.push(`題目 ${questionNum}: 圖片不存在 - ${imagePath}`);
              } else {
                imageInfo.imagePath = imagePath;
                imageInfo.exists = true;
              }
            } else {
              // 如果不是標準格式，嘗試直接查找
              const imagePath = `assets/images/${testName}/${subject}/${series_no}/${imgRef}`;
              if (!checkImageExists(imagePath)) {
                warnings.push(`題目 ${questionNum}: 圖片引用格式不明確或檔案不存在 - ${imgRef}`);
              } else {
                imageInfo.imagePath = imagePath;
                imageInfo.exists = true;
              }
            }
          }
          
          imageReferences.push(imageInfo);
        });
      }
    });
    
  } catch (error) {
    errors.push(`解析錯誤: ${error.message}`);
  }
  
  return { errors, warnings, imageReferences };
}

// 主程式
console.log('開始驗證所有 JSON 檔案...\n');

const jsonFiles = findJsonFiles(questionsDir);
console.log(`找到 ${jsonFiles.length} 個 JSON 檔案\n`);

let totalErrors = 0;
let totalWarnings = 0;
let totalImageRefs = 0;
let filesWithErrors = [];
let filesWithWarnings = [];

jsonFiles.forEach(filePath => {
  const relativePath = path.relative(questionsDir, filePath);
  const result = validateFile(filePath);
  
  if (result.errors.length > 0) {
    console.error(`❌ ${relativePath}:`);
    result.errors.forEach(err => console.error(`   - ${err}`));
    totalErrors += result.errors.length;
    filesWithErrors.push(relativePath);
  }
  
  if (result.warnings.length > 0) {
    console.warn(`⚠️  ${relativePath}:`);
    result.warnings.forEach(warn => console.warn(`   - ${warn}`));
    totalWarnings += result.warnings.length;
    filesWithWarnings.push(relativePath);
  }
  
  totalImageRefs += result.imageReferences.length;
});

console.log(`\n📊 驗證完成統計:`);
console.log(`   ✅ 總檔案數: ${jsonFiles.length}`);
console.log(`   ❌ 錯誤: ${totalErrors} 個 (${filesWithErrors.length} 個檔案)`);
console.log(`   ⚠️  警告: ${totalWarnings} 個 (${filesWithWarnings.length} 個檔案)`);
console.log(`   🖼️  圖片引用: ${totalImageRefs} 個`);

if (totalErrors === 0 && totalWarnings === 0) {
  console.log(`\n✅ 所有檔案驗證通過！`);
  process.exit(0);
} else {
  console.log(`\n❌ 發現問題，請檢查上述錯誤和警告`);
  process.exit(1);
}

