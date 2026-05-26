const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

function resolveFromAppOrRoot(pkg) {
  const local = path.join(projectRoot, 'node_modules', pkg);
  if (fs.existsSync(local)) return local;
  return path.join(monorepoRoot, 'node_modules', pkg);
}

const reactDir = resolveFromAppOrRoot('react');
const reactNativeDir = resolveFromAppOrRoot('react-native');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(monorepoRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  react: reactDir,
  'react-native': reactNativeDir,
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return { type: 'sourceFile', filePath: path.join(reactDir, 'index.js') };
  }
  if (moduleName.startsWith('react/')) {
    try {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, { paths: [reactDir] }),
      };
    } catch {
      // fall through
    }
  }
  if (moduleName === 'react-native') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('react-native', { paths: [reactNativeDir] }),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
