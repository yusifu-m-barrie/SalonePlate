const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 PNG (dark blue) — enough for local Expo Go dev
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const logoPath = path.join(assetsDir, 'logo.png');
const hasLogo = fs.existsSync(logoPath);

['icon.png', 'splash.png', 'adaptive-icon.png', 'notification-icon.png'].forEach((file) => {
  const dest = path.join(assetsDir, file);
  if (hasLogo) {
    fs.copyFileSync(logoPath, dest);
    console.log('Copied logo.png →', dest);
  } else {
    fs.writeFileSync(dest, PNG);
    console.log('Created placeholder', dest);
  }
});
