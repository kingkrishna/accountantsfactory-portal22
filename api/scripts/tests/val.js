const fs = require('fs');
const { execSync } = require('child_process');
try {
    execSync('npx prisma validate');
    fs.writeFileSync('val.txt', 'OK');
} catch (e) {
    fs.writeFileSync('val.txt', e.stdout ? e.stdout.toString() : '' + '\n' + (e.stderr ? e.stderr.toString() : ''));
}
