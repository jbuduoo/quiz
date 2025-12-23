const fs = require('fs');
const path = require('path');

console.log('🔍 開始驗證所有路徑連結...\n');

const errors = [];
const warnings = [];

// 1. 驗證題目檔案路徑（從 questions.json 索引檔案）
console.log('📋 驗證題目檔案路徑...');
const questionsJsonPath = path.join(__dirname, '..', 'assets', 'data', 'questions', 'questions.json');
if (fs.existsSync(questionsJsonPath)) {
  const questionsJson = JSON.parse(fs.readFileSync(questionsJsonPath, 'utf8'));
  const questionFiles = questionsJson.questionFiles || [];
  
  questionFiles.forEach((qf: any) => {
    const filePath = path.join(__dirname, '..', 'assets', 'data', 'questions', qf.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`❌ 題目檔案不存在: ${qf.file}`);
    } else {
      console.log(`  ✅ ${qf.file}`);
    }
  });
} else {
  warnings.push(`⚠️ 索引檔案不存在: ${questionsJsonPath}`);
}

// 2. 驗證 imageFileMap.ts 中的所有圖片路徑
console.log('\n🖼️  驗證圖片檔案路徑...');
const imageFileMapPath = path.join(__dirname, '..', 'src', 'services', 'imageFileMap.ts');
const imageFileMapContent = fs.readFileSync(imageFileMapPath, 'utf8');

const imageRequireMatches = imageFileMapContent.matchAll(/require\('([^']+)'\)/g);
const imageFiles = [];
// require 路徑是相對於 src/services/imageFileMap.ts 的
const imageFileMapDir = path.join(__dirname, '..', 'src', 'services');
for (const match of imageRequireMatches) {
  const requirePath = match[1];
  // 轉換相對路徑為絕對路徑（從 src/services/ 開始）
  const absolutePath = path.resolve(imageFileMapDir, requirePath);
  imageFiles.push({ requirePath, absolutePath });
}

imageFiles.forEach(({ requirePath, absolutePath }) => {
  if (!fs.existsSync(absolutePath)) {
    errors.push(`❌ 圖片檔案不存在: ${requirePath}`);
  } else {
    console.log(`  ✅ ${requirePath}`);
  }
});

// 3. 驗證 questions.json 中的檔案路徑
console.log('\n📊 驗證索引檔案中的路徑...');
// 先嘗試新路徑：assets/data/questions/questions.json
let questionsJsonPath = path.join(__dirname, '..', 'assets', 'data', 'questions', 'questions.json');
if (!fs.existsSync(questionsJsonPath)) {
  // 如果不存在，嘗試舊路徑：assets/data/questions.json
  questionsJsonPath = path.join(__dirname, '..', 'assets', 'data', 'questions.json');
}

let questionsJson;
if (!fs.existsSync(questionsJsonPath)) {
  errors.push(`❌ 索引檔案不存在: assets/data/questions/questions.json 或 assets/data/questions.json`);
  questionsJson = { questionFiles: [] };
} else {
  questionsJson = JSON.parse(fs.readFileSync(questionsJsonPath, 'utf8'));
}

if (questionsJson.questionFiles) {
  questionsJson.questionFiles.forEach(fileInfo => {
    // 檔案可能在 questions 資料夾內，也可能在 data 資料夾內
    let filePath = path.join(__dirname, '..', 'assets', 'data', 'questions', fileInfo.file);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '..', 'assets', 'data', fileInfo.file);
    }
    if (!fs.existsSync(filePath)) {
      errors.push(`❌ 索引檔案中引用的檔案不存在: ${fileInfo.file}`);
    } else {
      // 驗證檔案內容
      try {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let questionCount = 0;
        
        // 支援兩種格式：
        // 1. 陣列格式：直接是題目陣列 [{...}, {...}]
        // 2. 物件格式：{ questions: [...] }
        if (Array.isArray(fileContent)) {
          questionCount = fileContent.length;
        } else if (fileContent.questions && Array.isArray(fileContent.questions)) {
          questionCount = fileContent.questions.length;
        } else {
          warnings.push(`⚠️  檔案格式不正確: ${fileInfo.file} (應為題目陣列或包含 questions 陣列的物件)`);
          return;
        }
        
        if (questionCount !== fileInfo.count) {
          warnings.push(`⚠️  題數不一致: ${fileInfo.file} (索引: ${fileInfo.count}, 實際: ${questionCount})`);
        } else {
          console.log(`  ✅ ${fileInfo.file} (${questionCount} 題)`);
        }
      } catch (e) {
        errors.push(`❌ 無法解析 JSON 檔案: ${fileInfo.file} - ${e.message}`);
      }
    }
  });
}

// 4. 驗證配置檔案（可選，因為新格式可以從 questions.json 載入）
console.log('\n⚙️  驗證配置檔案...');
const configPath = path.join(__dirname, '..', 'assets', 'config', 'quiz-library-config.json');
if (!fs.existsSync(configPath)) {
  // 檢查 questions.json 是否有 config 欄位
  if (questionsJson && questionsJson.config) {
    console.log(`  ℹ️  配置檔案不存在，但 questions.json 包含 config 欄位（使用內嵌配置）`);
  } else {
    warnings.push(`⚠️  配置檔案不存在: assets/config/quiz-library-config.json（可選，可用 questions.json 的 config 欄位替代）`);
  }
} else {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!Array.isArray(config)) {
      warnings.push(`⚠️  配置檔案格式錯誤: 應該是陣列`);
    } else {
      console.log(`  ✅ 配置檔案格式正確 (${config.length} 個題庫)`);
    }
  } catch (e) {
    errors.push(`❌ 無法解析配置檔案: ${e.message}`);
  }
}

// 5. 驗證主要索引檔案
console.log('\n📑 驗證主要索引檔案...');
// 重新檢查路徑（因為可能已經在步驟3中找到了）
questionsJsonPath = path.join(__dirname, '..', 'assets', 'data', 'questions', 'questions.json');
if (!fs.existsSync(questionsJsonPath)) {
  questionsJsonPath = path.join(__dirname, '..', 'assets', 'data', 'questions.json');
}

if (!fs.existsSync(questionsJsonPath)) {
  errors.push(`❌ 主要索引檔案不存在: assets/data/questions/questions.json 或 assets/data/questions.json`);
} else {
  console.log(`  ✅ 主要索引檔案存在: ${path.relative(path.join(__dirname, '..'), questionsJsonPath)}`);
  
  // 驗證索引檔案結構（新格式可能沒有這些欄位，所以改為警告而非錯誤）
  if (!questionsJson.config && !questionsJson.metadata) {
    warnings.push(`⚠️  索引檔案缺少 config 或 metadata`);
  }
  // 新格式可能沒有 testNames/subjects/series，這些是可選的
  if (questionsJson.testNames && !Array.isArray(questionsJson.testNames)) {
    warnings.push(`⚠️  索引檔案 testNames 不是陣列`);
  }
  if (questionsJson.subjects && !Array.isArray(questionsJson.subjects)) {
    warnings.push(`⚠️  索引檔案 subjects 不是陣列`);
  }
  if (questionsJson.series && !Array.isArray(questionsJson.series)) {
    warnings.push(`⚠️  索引檔案 series 不是陣列`);
  }
  if (!questionsJson.questionFiles || !Array.isArray(questionsJson.questionFiles)) {
    errors.push(`❌ 索引檔案缺少 questionFiles 陣列`);
  } else {
    console.log(`  ✅ questionFiles 陣列存在 (${questionsJson.questionFiles.length} 個檔案)`);
  }
}

// 6. 驗證 App.tsx 中的資源引用
console.log('\n📱 驗證應用程式資源...');
const appTsxPath = path.join(__dirname, '..', 'App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

// 檢查 back.png
const backImagePath = path.join(__dirname, '..', 'assets', 'back.png');
if (!fs.existsSync(backImagePath)) {
  warnings.push(`⚠️  返回按鈕圖片不存在: assets/back.png`);
} else {
  console.log(`  ✅ assets/back.png`);
}

// 總結
console.log('\n' + '='.repeat(60));
console.log('📊 驗證結果總結');
console.log('='.repeat(60));

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ 所有路徑驗證通過！');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`\n❌ 發現 ${errors.length} 個錯誤：`);
    errors.forEach(error => console.log(`  ${error}`));
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  發現 ${warnings.length} 個警告：`);
    warnings.forEach(warning => console.log(`  ${warning}`));
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

