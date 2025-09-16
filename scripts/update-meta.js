#!/usr/bin/env node

/**
 * 快速更新文档元数据的脚本
 * 相当于运行: npx tsx scripts/update.ts
 */

import { spawn } from 'child_process';

console.log('正在更新文档元数据...');

const updateProcess = spawn('npx', ['tsx', 'scripts/update.ts'], {
  stdio: 'inherit',
  shell: true
});

updateProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ 文档元数据更新完成！');
  } else {
    console.error('❌ 更新失败，退出码:', code);
    process.exit(1);
  }
});

updateProcess.on('error', (error) => {
  console.error('❌ 运行更新脚本时出错:', error.message);
  process.exit(1);
});