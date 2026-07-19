const { execSync } = require('child_process');
const fs = require('fs');
try {
  const status = execSync('git status --short', { stdio: 'pipe' }).toString();
  const log = execSync('git log -1 --oneline', { stdio: 'pipe' }).toString();
  fs.writeFileSync('git_info.txt', `STATUS:\n${status}\nLOG:\n${log}`);
} catch (e) {
  fs.writeFileSync('git_info.txt', e.toString());
}
