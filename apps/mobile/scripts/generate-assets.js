const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 PNG (dark blue) — enough for local Expo Go dev
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

['icon.png', 'splash.png', 'adaptive-icon.png', 'notification-icon.png'].forEach((file) => {
  const dest = path.join(assetsDir, file);
  fs.writeFileSync(dest, PNG);
  console.log('Created', dest);
});
