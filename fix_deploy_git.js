// scripts/fix_deploy_git.js
hexo.on('deployAfter', () => {
    const { execSync } = require('child_process');
    const path = require('path');
    const deployDir = path.join(hexo.base_dir, '.deploy_git');

    try {
        execSync('git config core.autocrlf true', { cwd: deployDir });
        console.log('已在 .deploy_git 中設定 core.autocrlf=true');
    } catch (error) {
        console.error('設定 .deploy_git 中的 core.autocrlf 時發生錯誤：', error);
    }
});