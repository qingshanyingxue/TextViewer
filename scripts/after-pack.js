/**
 * Electron 打包后加固脚本（备选方案）
 */

const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const asarmor = require('asarmor');

const path = require('path');
const fs = require('fs');

async function main(buildResult) {
  const platformName = typeof buildResult.platform === 'string'
    ? buildResult.platform
    : buildResult.platform?.nodeName || process.platform;

  const { appOutDir, packager } = buildResult;
  const appName = packager.appInfo.productFilename;
  
  let executablePath;
  if (platformName === 'win32') {
    executablePath = path.join(appOutDir, `${appName}.exe`);
  } else if (platformName === 'darwin') {
    executablePath = path.join(appOutDir, `${appName}.app`, 'Contents', 'MacOS', appName);
  } else {
    executablePath = path.join(appOutDir, appName);
  }

  console.log('\n🔒 开始 Electron 应用加固...');
  console.log('   平台:', platformName);
  console.log('   应用名:', appName);

  // ── 1. asarmor：简单文件破坏方法 ──────────────────────────────
  try {
    const asarPath = path.join(appOutDir, 'resources', 'app.asar');
    
    if (!fs.existsSync(asarPath)) {
      throw new Error(`找不到 ASAR 文件: ${asarPath}`);
    }

    console.log('   正在处理 ASAR:', asarPath);
    
    // 方法1：直接使用 createTrashPatch 和 createBloatPatch
    const asarBuffer = fs.readFileSync(asarPath);
    
    // 创建垃圾数据补丁
    const bloatPatch = asarmor.createBloatPatch(1024 * 50); // 50KB 垃圾数据
    const trashPatch = asarmor.createTrashPatch();
    
    // 应用补丁到 buffer
    let patchedBuffer = asarBuffer;
    
    // 应用 trash patch（破坏文件头）
    if (trashPatch && typeof trashPatch === 'function') {
      patchedBuffer = trashPatch(patchedBuffer);
    } else if (trashPatch && trashPatch.patch) {
      patchedBuffer = trashPatch.patch(patchedBuffer);
    }
    
    // 应用 bloat patch（添加垃圾数据）
    if (bloatPatch && typeof bloatPatch === 'function') {
      patchedBuffer = bloatPatch(patchedBuffer);
    } else if (bloatPatch && bloatPatch.patch) {
      patchedBuffer = bloatPatch.patch(patchedBuffer);
    }
    
    // 写回文件
    fs.writeFileSync(asarPath, patchedBuffer);
    
    console.log('   ✅ asarmor 已成功破坏 ASAR 结构');
  } catch (err) {
    console.error('   ❌ asarmor 处理失败:', err.message);
  }

  // ── 2. @electron/fuses ──────────────────────────────
  try {
    if (!fs.existsSync(executablePath)) {
      throw new Error(`找不到可执行文件: ${executablePath}`);
    }

    console.log('   正在注入 Fuses...');

    await flipFuses(executablePath, {
      version: FuseVersion.V1,
      [FuseV1Options.EnableAsarIntegrity]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: true,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspect]: false,
    });
    
    console.log('   ✅ @electron/fuses 已成功启用');
  } catch (err) {
    console.error('   ❌ fuses 处理失败:', err.message);
  }

  console.log('🔒 加固流程结束\n');
}

module.exports = main;