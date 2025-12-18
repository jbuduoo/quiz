import { registerRootComponent } from 'expo';

import App from './App';

console.log('🚀 [index.ts] 開始載入應用程式');
console.log('🚀 [index.ts] 時間:', new Date().toISOString());

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
console.log('🚀 [index.ts] 呼叫 registerRootComponent');
registerRootComponent(App);
console.log('✅ [index.ts] registerRootComponent 完成');
