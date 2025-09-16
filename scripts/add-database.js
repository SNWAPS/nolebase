#!/usr/bin/env node

/**
 * 自动添加新数据库的脚本
 * 使用方法: node scripts/add-database.js <数据库名称>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('用法: node scripts/add-database.js <数据库名称>');
  process.exit(1);
}

const dbName = args[0];
const rootDir = process.cwd();

console.log(`正在添加数据库: ${dbName}`);

try {
  // 1. 更新 metadata/index.ts
  const metadataPath = join(rootDir, 'metadata', 'index.ts');
  let metadataContent = readFileSync(metadataPath, 'utf-8');
  
  // 查找 include 数组
  const includeMatch = metadataContent.match(/export\s+const\s+include\s*=\s*\[([\s\S]*?)\]/);
  if (!includeMatch) {
    throw new Error('无法在 metadata/index.ts 中找到 include 数组');
  }
  
  const currentInclude = includeMatch[1];
  const newInclude = currentInclude.includes(`'${dbName}'`) 
    ? currentInclude 
    : currentInclude.trim() + `, '${dbName}'`;
  
  metadataContent = metadataContent.replace(
    /export\s+const\s+include\s*=\s*\[([\s\S]*?)\]/,
    `export const include = [${newInclude}]`
  );
  
  writeFileSync(metadataPath, metadataContent);
  console.log('✓ 已更新 metadata/index.ts');
  
  // 2. 创建数据库目录结构
  const dbDir = join(rootDir, dbName);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir);
    console.log(`✓ 已创建目录: ${dbName}`);
  }
  
  // 创建主页
  const indexPath = join(dbDir, 'index.md');
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `# ${dbName}\n\n这是${dbName}的主页。`);
    console.log(`✓ 已创建: ${dbName}/index.md`);
  }
  
  // 创建标准目录
  const stdDir = join(dbDir, '标准');
  if (!existsSync(stdDir)) {
    mkdirSync(stdDir);
    console.log(`✓ 已创建目录: ${dbName}/标准`);
  }
  
  // 创建标准目录主页
  const stdIndexPath = join(stdDir, 'index.md');
  if (!existsSync(stdIndexPath)) {
    writeFileSync(stdIndexPath, `# ${dbName}标准`);
    console.log(`✓ 已创建: ${dbName}/标准/index.md`);
  }
  
  // 3. 更新 .vitepress/config.ts
  const configPath = join(rootDir, '.vitepress', 'config.ts');
  let configContent = readFileSync(configPath, 'utf-8');
  
  // 查找导航栏配置
  const navMatch = configContent.match(/nav:\s*\[([\s\S]*?)\]/);
  if (!navMatch) {
    throw new Error('无法在 .vitepress/config.ts 中找到 nav 配置');
  }
  
  // 在导航栏中添加新数据库
  const navConfig = navMatch[1];
  const dbLink = `{ text: '${dbName}', link: '/${dbName}/' }`;
  
  // 检查是否已存在
  if (!navConfig.includes(`'${dbName}'`)) {
    // 在 "最近更新" 之前插入
    const newNavConfig = navConfig.replace(
      /(\{[^}]*text:\s*['"]最近更新['"][^}]*\})/,
      `${dbLink},\n    $1`
    );
    
    configContent = configContent.replace(
      /nav:\s*\[([\s\S]*?)\]/,
      `nav: [${newNavConfig}]`
    );
    console.log('✓ 已更新 .vitepress/config.ts 导航栏');
  }
  
  // 查找并更新侧边栏配置
  const sidebarMatch = configContent.match(/sidebar:\s*\{([\s\S]*?)\}/);
  if (!sidebarMatch) {
    throw new Error('无法在 .vitepress/config.ts 中找到 sidebar 配置');
  }
  
  // 添加侧边栏配置
  const sidebarConfig = sidebarMatch[1];
  const newSidebarConfig = sidebarConfig + `\n    "/${dbName}/": getSidebar('${dbName}'),\n`;
  
  configContent = configContent.replace(
    /sidebar:\s*\{([\s\S]*?)\}/,
    `sidebar: {${newSidebarConfig}}`
  );
  
  writeFileSync(configPath, configContent);
  console.log('✓ 已更新 .vitepress/config.ts 侧边栏');
  
  console.log(`\n✅ 数据库 ${dbName} 添加完成！`);
  console.log('下一步: 运行 "npx tsx scripts/update.ts" 更新文档元数据');
  
} catch (error) {
  console.error('❌ 添加数据库失败:', error.message);
  process.exit(1);
}