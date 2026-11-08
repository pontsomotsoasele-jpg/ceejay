const localFrontendUrl = 'http://localhost:3000';

function configuredFrontendUrls() {
  return String(process.env.CLIENT_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function getAllowedFrontendOrigins() {
  const configuredUrls = configuredFrontendUrls();
  return [...new Set([
    ...configuredUrls,
    ...(process.env.NODE_ENV === 'production' ? [] : [localFrontendUrl]),
  ])];
}

function getFrontendRedirectUrl() {
  const configuredUrls = configuredFrontendUrls();
  return configuredUrls.find((url) => !url.includes('localhost'))
    || localFrontendUrl;
}

module.exports = { getAllowedFrontendOrigins, getFrontendRedirectUrl };
