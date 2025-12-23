const fs = require('fs');
const path = require('path');

// 讀取版本配置
const versionConfigPath = path.join(__dirname, '../assets/config/version.config.json');
let versionConfig;

try {
  const versionConfigContent = fs.readFileSync(versionConfigPath, 'utf8');
  versionConfig = JSON.parse(versionConfigContent);
} catch (error) {
  console.error('❌ 無法讀取 version.config.json:', error);
  console.error('   請確認檔案存在於: assets/config/version.config.json');
  process.exit(1);
}

const currentVersion = versionConfig.currentVersion || 'default';
console.log(`📦 準備建置版本: ${currentVersion}`);

// 驗證版本目錄是否存在
const versionsConfigDir = path.join(__dirname, '../assets/config/versions', currentVersion);
const versionsQuestionsDir = path.join(__dirname, '../assets/data/questions/versions', currentVersion);

console.log('\n📋 驗證版本目錄...');

if (!fs.existsSync(versionsConfigDir)) {
  console.error(`❌ 版本配置目錄不存在: ${versionsConfigDir}`);
  console.error(`   請確認版本 "${currentVersion}" 的配置目錄存在`);
  process.exit(1);
}
console.log(`✅ 配置目錄存在: ${versionsConfigDir}`);

if (!fs.existsSync(versionsQuestionsDir)) {
  console.error(`❌ 版本題目目錄不存在: ${versionsQuestionsDir}`);
  console.error(`   請確認版本 "${currentVersion}" 的題目目錄存在`);
  process.exit(1);
}
console.log(`✅ 題目目錄存在: ${versionsQuestionsDir}`);

// 檢查必要的檔案是否存在
const questionsJsonPath = path.join(versionsQuestionsDir, 'questions.json');
if (!fs.existsSync(questionsJsonPath)) {
  console.warn(`⚠️  警告: questions.json 不存在於 ${versionsQuestionsDir}`);
}

const appConfigPath = path.join(versionsConfigDir, 'app-config.json');
if (!fs.existsSync(appConfigPath)) {
  console.warn(`⚠️  警告: app-config.json 不存在於 ${versionsConfigDir}`);
}

const quizLibraryConfigPath = path.join(versionsConfigDir, 'quiz-library-config.json');
if (!fs.existsSync(quizLibraryConfigPath)) {
  console.warn(`⚠️  警告: quiz-library-config.json 不存在於 ${versionsConfigDir}`);
}

console.log(`\n✅ 版本驗證完成！當前版本: ${currentVersion}`);
console.log(`   打包時會包含所有版本的目錄`);

