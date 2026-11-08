const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Content = require('../models/Content');
const SocialAccount = require('../models/SocialAccount');
const User = require('../models/User');
const { encrypt, decrypt } = require('../services/tokenVault');
const slugify = require('../utils/slug');
const { getFrontendRedirectUrl } = require('../config/frontendOrigins');

const graphBase = 'https://graph.facebook.com/v22.0';

function frontendUrl() {
  return getFrontendRedirectUrl();
}

function redirectUri(provider) {
  const configured = process.env[`${provider.toUpperCase()}_REDIRECT_URI`];
  return configured || `http://localhost:${process.env.PORT || 5000}/api/social/${provider}/callback`;
}

function requireOAuthConfig(provider) {
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`] || process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || process.env.FACEBOOK_APP_SECRET;
  if (!clientId || !clientSecret) throw new Error(`${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET are required.`);
  if (provider === 'facebook' && !/^[a-f\d]{32}$/i.test(clientSecret)) {
    throw new Error('FACEBOOK_APP_SECRET must be the 32-character App Secret for the same Meta app as FACEBOOK_APP_ID. Update backend/.env from Meta Developers, then restart the backend.');
  }
  if (!process.env.TOKEN_ENCRYPTION_KEY) throw new Error('TOKEN_ENCRYPTION_KEY is required to connect social accounts.');
  return { clientId, clientSecret };
}

async function syncConnectedAccount(provider, creatorId) {
  const account = await SocialAccount.findOne({ provider, connectedBy: creatorId })
    .select('+accessToken +refreshToken');
  if (!account) throw new Error('Social account was saved, but it could not be loaded for syncing.');
  const imported = provider === 'google'
    ? await syncYouTube(account)
    : await syncFacebook(account);
  account.lastSyncedAt = new Date();
  await account.save();
  return imported;
}

function createState(creatorId, provider) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
  return jwt.sign({ purpose: 'social-connect', creatorId, provider }, process.env.JWT_SECRET, { expiresIn: '10m' });
}

function startConnect(provider) {
  return (req, res, next) => {
    try {
      const { clientId } = requireOAuthConfig(provider);
      const state = createState(req.creator.id, provider);
      const url = provider === 'google'
        ? new URL('https://accounts.google.com/o/oauth2/v2/auth')
        : new URL('https://www.facebook.com/v22.0/dialog/oauth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri(provider));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', state);
      if (provider === 'google') {
        url.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/youtube.readonly');
        url.searchParams.set('access_type', 'offline');
        url.searchParams.set('prompt', 'consent');
      } else {
        const configId = process.env.FACEBOOK_CONFIG_ID || '1147158737755594';
        url.searchParams.set('config_id', configId);
      }
      return res.json({ authorizationUrl: url.toString() });
    } catch (error) {
      return res.status(503).json({ message: error.message });
    }
  };
}

async function exchangeCode(provider, code) {
  const { clientId, clientSecret } = requireOAuthConfig(provider);
  if (provider === 'facebook') {
    const url = new URL(`${graphBase}/oauth/access_token`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('code', code);
    url.searchParams.set('redirect_uri', redirectUri(provider));
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error?.message || 'Facebook authorization code could not be exchanged.');
    }
    return payload;
  }

  const endpoint = provider === 'google'
    ? 'https://oauth2.googleapis.com/token'
    : '';
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri(provider),
    grant_type: 'authorization_code',
  });
  const response = await fetch(endpoint, { method: 'POST', body });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error?.message || `Unable to connect ${provider}.`);
  }
  return payload;
}

async function saveFacebookPageAccount(accessToken, creatorId) {
  let pageAccessToken = accessToken;
  const { clientId, clientSecret } = requireOAuthConfig('facebook');
  const longLivedUrl = new URL(`${graphBase}/oauth/access_token`);
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longLivedUrl.searchParams.set('client_id', clientId);
  longLivedUrl.searchParams.set('client_secret', clientSecret);
  longLivedUrl.searchParams.set('fb_exchange_token', accessToken);
  const longLivedResponse = await fetch(longLivedUrl);
  const longLived = await longLivedResponse.json();
  if (longLivedResponse.ok && longLived.access_token) pageAccessToken = longLived.access_token;

  const pagesUrl = new URL(`${graphBase}/me/accounts`);
  pagesUrl.searchParams.set('fields', 'id,name,access_token');
  pagesUrl.searchParams.set('access_token', pageAccessToken);
  const pagesResponse = await fetch(pagesUrl);
  const pagesResult = await pagesResponse.json();
  if (!pagesResponse.ok) {
    throw new Error(pagesResult.error?.message || 'Unable to read the connected Facebook Pages.');
  }
  const page = pagesResult.data?.[0];
  if (!page?.id || !page.access_token) {
    throw new Error('No Facebook Page was returned. Choose a Page in the Meta permissions dialog and try again.');
  }

  const pageProfileUrl = new URL(`${graphBase}/${encodeURIComponent(page.id)}`);
  pageProfileUrl.searchParams.set('fields', 'id,name,about,category,website,link,picture');
  pageProfileUrl.searchParams.set('access_token', page.access_token);
  const pageProfileResponse = await fetch(pageProfileUrl);
  const pageProfile = await pageProfileResponse.json();
  if (!pageProfileResponse.ok) {
    throw new Error(pageProfile.error?.message || 'Unable to read the public Facebook Page details.');
  }

  const profileUrl = new URL(`${graphBase}/me`);
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', pageAccessToken);
  const profileResponse = await fetch(profileUrl);
  const profile = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error(profile.error?.message || 'Unable to read the authorized Facebook account.');
  }

  await SocialAccount.findOneAndUpdate(
    { provider: 'facebook', accountId: page.id },
    {
      provider: 'facebook',
      accountId: page.id,
      accountName: profile.name || page.name,
      email: profile.email || '',
      pageId: page.id,
      pageName: pageProfile.name || page.name,
      pageAbout: String(pageProfile.about || '').slice(0, 5000),
      pageCategory: String(pageProfile.category || '').slice(0, 120),
      pageWebsite: String(pageProfile.website || '').slice(0, 500),
      pagePictureUrl: String(pageProfile.picture?.data?.url || '').slice(0, 2000),
      pageLink: String(pageProfile.link || `https://www.facebook.com/${page.id}`).slice(0, 2000),
      accessToken: encrypt(page.access_token),
      refreshToken: '',
      expiresAt: null,
      connectedBy: creatorId,
    },
    { upsert: true, new: true, runValidators: true },
  );
}

async function handleCallback(provider, req, res) {
  const fail = (message) => res.redirect(`${frontendUrl()}/dashboard/social?error=${encodeURIComponent(message)}`);
  try {
    if (req.query.error) return fail('Social account connection was cancelled.');
    if (mongoose.connection.readyState !== 1) {
      const providerName = provider === 'google' ? 'YouTube' : 'Facebook';
      return fail(`${providerName} authorization opened, but MongoDB Atlas is disconnected. Reconnect Atlas and try again.`);
    }
    const state = jwt.verify(String(req.query.state || ''), process.env.JWT_SECRET);
    if (state.purpose !== 'social-connect' || state.provider !== provider) {
      return fail('Invalid social connection request. Please try again.');
    }
    if (!req.query.code) return fail('The provider did not return an authorization code.');
    const tokens = await exchangeCode(provider, String(req.query.code));

    if (provider === 'google') {
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userResponse.json();
      if (!userResponse.ok || !user.sub || !user.email) throw new Error('Google did not return a channel account profile.');
      await SocialAccount.findOneAndUpdate(
        { provider, accountId: user.sub },
        {
          provider,
          accountId: user.sub,
          accountName: user.name || user.email,
          email: user.email,
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token || ''),
          expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
          connectedBy: state.creatorId,
        },
        { upsert: true, new: true, runValidators: true },
      );
    } else {
      await saveFacebookPageAccount(tokens.access_token, state.creatorId);
    }
    try {
      await syncConnectedAccount(provider, state.creatorId);
      return res.redirect(`${frontendUrl()}/dashboard/social?connected=${provider}`);
    } catch (syncError) {
      console.error(`Initial ${provider} sync failed: ${syncError.message}`);
      return res.redirect(`${frontendUrl()}/dashboard/social?connected=${provider}&sync=failed`);
    }
  } catch (error) {
    return fail(error.message || 'Unable to connect the social account.');
  }
}

async function listAccounts(req, res, next) {
  try {
    const accounts = await SocialAccount.find({ connectedBy: req.creator.id })
      .select('provider accountId accountName email pageId pageName lastSyncedAt')
      .sort({ provider: 1 })
      .lean();
    const accountEmails = accounts.map((account) => account.email).filter(Boolean);
    return res.json({
      accounts,
      sameEmailLinked: accountEmails.length > 1 && new Set(accountEmails.map((email) => email.toLowerCase())).size === 1,
    });
  } catch (error) {
    return next(error);
  }
}

async function fetchGoogle(accessToken, path) {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'YouTube content could not be loaded.');
  return result;
}

async function freshGoogleToken(account) {
  if (account.expiresAt && account.expiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(account.accessToken);
  }
  const refreshToken = decrypt(account.refreshToken);
  if (!refreshToken) throw new Error('Google authorization expired. Reconnect the YouTube channel.');
  const { clientId, clientSecret } = requireOAuthConfig('google');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error('Google authorization expired. Reconnect the YouTube channel.');
  account.accessToken = encrypt(result.access_token);
  account.expiresAt = new Date(Date.now() + (result.expires_in || 3600) * 1000);
  await account.save();
  return result.access_token;
}

async function syncYouTube(account) {
  const token = await freshGoogleToken(account);
  const channelResult = await fetchGoogle(token, 'channels?part=contentDetails%2Csnippet&mine=true');
  const channel = channelResult.items?.[0];
  if (!channel) throw new Error('No YouTube channel was found for this Google account.');
  if (channel.snippet?.title) account.accountName = channel.snippet.title;
  const googleProfileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const googleProfile = await googleProfileResponse.json();
  if (!googleProfileResponse.ok) {
    throw new Error(googleProfile.error?.message || 'Google profile details could not be loaded.');
  }
  if (googleProfile.picture) {
    const creator = await User.findById(account.connectedBy);
    if (creator && creator.imageUrl !== googleProfile.picture) {
      creator.imageUrl = googleProfile.picture;
      await creator.save();
    }
  }
  const uploads = channel.contentDetails.relatedPlaylists.uploads;
  const playlist = await fetchGoogle(token, `playlistItems?part=snippet%2CcontentDetails&maxResults=50&playlistId=${encodeURIComponent(uploads)}`);
  const playlistItems = (playlist.items || []).filter((item) => (
    item.contentDetails?.videoId || item.snippet?.resourceId?.videoId
  ));
  const videoIds = playlistItems.map((item) => item.contentDetails?.videoId || item.snippet.resourceId.videoId);
  const videoStatus = videoIds.length
    ? await fetchGoogle(token, `videos?part=status&id=${encodeURIComponent(videoIds.join(','))}`)
    : { items: [] };
  const publicVideoIds = new Set(
    (videoStatus.items || [])
      .filter((video) => video.status?.privacyStatus === 'public')
      .map((video) => video.id),
  );
  const items = playlistItems.filter((item) => (
    publicVideoIds.has(item.contentDetails?.videoId || item.snippet.resourceId.videoId)
  )).map((item) => {
    const snippet = item.snippet;
    const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId;
    const thumbnail = snippet.thumbnails?.maxres || snippet.thumbnails?.high || snippet.thumbnails?.medium || snippet.thumbnails?.default;
    return {
      title: snippet.title || 'YouTube video',
      description: snippet.description || 'A video from the connected YouTube channel.',
      category: 'YouTube',
      type: 'Video',
      thumbnailUrl: thumbnail?.url || '',
      mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
      platform: 'YouTube',
      externalId: videoId,
      platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  });
  const nonPublicVideoIds = videoIds.filter((videoId) => !publicVideoIds.has(videoId));
  if (nonPublicVideoIds.length) {
    await Content.updateMany(
      { platform: 'YouTube', externalId: { $in: nonPublicVideoIds } },
      { $set: { status: 'Draft' } },
    );
  }
  return upsertImported(items);
}

async function syncFacebook(account) {
  const token = decrypt(account.accessToken);
  const profileUrl = new URL(`${graphBase}/${encodeURIComponent(account.pageId)}`);
  profileUrl.searchParams.set('fields', 'id,name,about,category,website,link,picture');
  profileUrl.searchParams.set('access_token', token);
  const profileResponse = await fetch(profileUrl);
  const profile = await profileResponse.json();
  if (!profileResponse.ok) throw new Error(profile.error?.message || 'Facebook Page details could not be loaded.');
  account.pageName = profile.name || account.pageName;
  account.pageAbout = String(profile.about || '').slice(0, 5000);
  account.pageCategory = String(profile.category || '').slice(0, 120);
  account.pageWebsite = String(profile.website || '').slice(0, 500);
  account.pagePictureUrl = String(profile.picture?.data?.url || '').slice(0, 2000);
  account.pageLink = String(profile.link || `https://www.facebook.com/${account.pageId}`).slice(0, 2000);
  await account.save();

  const postsUrl = new URL(`${graphBase}/${encodeURIComponent(account.pageId)}/posts`);
  postsUrl.searchParams.set('fields', 'id,message,permalink_url,full_picture,created_time,attachments{type,media_type,url,media,target,subattachments{type,media_type,url,media,target}}');
  postsUrl.searchParams.set('limit', '100');
  postsUrl.searchParams.set('access_token', token);
  const response = await fetch(postsUrl);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Facebook Page posts could not be loaded.');
  const items = (result.data || []).map((post) => {
    const description = String(post.message || 'A post from the connected Facebook Page.').slice(0, 5000);
    const title = description.split('\n')[0].slice(0, 140) || 'Facebook post';
    const attachments = post.attachments?.data || [];
    const isVideoAttachment = (attachment) => (
      attachment?.media_type?.toLowerCase() === 'video'
      || attachment?.type?.toLowerCase().includes('video')
      || (attachment?.subattachments?.data || []).some(isVideoAttachment)
    );
    const isVideo = attachments.some(isVideoAttachment);
    return {
      title,
      description,
      category: 'Facebook',
      type: isVideo ? 'Video' : post.full_picture ? 'Image' : 'Article',
      thumbnailUrl: post.full_picture || '',
      mediaUrl: post.permalink_url || '',
      publishedAt: post.created_time ? new Date(post.created_time) : new Date(),
      platform: 'Facebook',
      externalId: post.id,
      platformUrl: post.permalink_url || '',
    };
  });
  return upsertImported(items);
}

async function upsertImported(items) {
  for (const item of items) {
    await Content.findOneAndUpdate(
      { platform: item.platform, externalId: item.externalId },
      {
        $set: { ...item, status: 'Published' },
        $setOnInsert: { slug: slugify(item.title), featured: false, views: 0, likesCount: 0 },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }
  return items.length;
}

async function syncAccount(req, res, next) {
  try {
    if (!['google', 'facebook'].includes(req.params.provider)) {
      return res.status(400).json({ message: 'Choose Google or Facebook.' });
    }
    const provider = req.params.provider;
    const accountExists = await SocialAccount.exists({
      provider,
      connectedBy: req.creator.id,
    });
    if (!accountExists) return res.status(404).json({ message: 'Connect this platform before syncing.' });
    const imported = await syncConnectedAccount(provider, req.creator.id);
    const platformName = provider === 'google' ? 'YouTube' : 'Facebook';
    return res.json({ imported, provider, message: `${imported} ${platformName} items synced.` });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  startConnect,
  handleCallback,
  listAccounts,
  syncAccount,
};
