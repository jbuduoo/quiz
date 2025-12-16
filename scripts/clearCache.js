const fs = require('fs');
const path = require('path');

const dirsToClean = [
  path.join(__dirname, '..', 'node_modules', '.cache'),
  path.join(__dirname, '..', '.expo'),
  path.join(__dirname, '..', '.metro'),
];

console.log('清除快取...\n');

dirsToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ 已清除: ${path.basename(dir)}`);
    } catch (e) {
      console.log(`⚠️  無法清除 ${dir}: ${e.message}`);
    }
  } else {
    console.log(`ℹ️  不存在: ${path.basename(dir)}`);
  }
});

console.log('\n✅ 快取清除完成！請重新執行: npx expo start --clear --web');

