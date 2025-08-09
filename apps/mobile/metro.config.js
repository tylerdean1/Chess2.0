const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Alias problematic react-native imports to react-native-web equivalents for web platform
const ALIASES = {
  '../Utilities/Platform': 'react-native-web/dist/exports/Platform',
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && ALIASES[moduleName]) {
    return context.resolveRequest(context, ALIASES[moduleName], platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
