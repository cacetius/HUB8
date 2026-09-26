const { readdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(filePath);
    } else if (entry.isFile() && filePath.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}

checkDirectory(path.join(__dirname, '..', 'src'));
