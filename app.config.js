/* eslint-env node */
/**
 * Dynamic Expo config: merges app.json and bakes API URL into extra.apiUrl.
 * EAS and local builds evaluate this in Node with env from eas.json / .env, so the
 * runtime bundle can read Constants.expoConfig.extra.apiUrl when Metro does not
 * inline process.env.EXPO_PUBLIC_*.
 */
const appJson = require('./app.json');

const STAGING = 'https://tailorcraft-staging.rogojan.com';
const PRODUCTION = 'https://tailorcraft.rogojan.com';

function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const profile = process.env.EAS_BUILD_PROFILE || '';
  if (profile === 'production') return PRODUCTION;
  if (
    profile === 'preview' ||
    profile === 'staging' ||
    profile === 'development'
  ) {
    return STAGING;
  }

  // Local expo start / Xcode without EAS: safe default (matches .env.staging in repo)
  return STAGING;
}

module.exports = () => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl: resolveApiUrl(),
    },
  },
});
