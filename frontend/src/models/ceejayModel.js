import axios from 'axios';

const configuredApiUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
const normalizedApiUrl = configuredApiUrl?.replace(/\/+$/, '');
const API_BASE_URL = normalizedApiUrl
  ? normalizedApiUrl.endsWith('/api') ? normalizedApiUrl : `${normalizedApiUrl}/api`
  : 'http://localhost:5000/api';

export const CREATOR_NAME = 'Ceejay Da Mafia';
export const CREATOR_PROFILE_IMAGE = process.env.REACT_APP_CREATOR_PROFILE_IMAGE
  || 'https://tse3.mm.bing.net/th/id/OIP.6FugnTWdiPfqdfQG6GYp0wHaJQ?r=0&rs=1&pid=ImgDetMain&o=7&rm=3';
const STORAGE_KEYS = { token: 'ceejay_token', user: 'ceejay_user' };

export function getPostDisplayTitle(post) {
  const title = post?.title?.trim() || '';
  return /^(facebook|youtube) video \d+$/i.test(title) ? '' : title;
}

export function getYoutubeVideoId(url = '') {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let videoId = '';
    if (host === 'youtu.be') videoId = parsed.pathname.slice(1).split('/')[0] || '';
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      videoId = parsed.searchParams.get('v') || parsed.pathname.match(/(?:shorts|embed)\/([^/?]+)/i)?.[1] || '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
  } catch {
    return '';
  }
}

export function getVideoThumbnail(post) {
  if (post.thumbnailUrl) return post.thumbnailUrl;
  const videoId = getYoutubeVideoId(post.url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
}

export function getVideoEmbedUrl(post) {
  const videoId = getYoutubeVideoId(post.url);
  if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;

  try {
    const parsed = new URL(post.url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'facebook.com' || host.endsWith('.facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(post.url)}&show_text=false&width=560`;
    }
  } catch {
    return '';
  }
  return '';
}

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getSession() {
  const storedUser = localStorage.getItem(STORAGE_KEYS.user);
  const token = localStorage.getItem(STORAGE_KEYS.token);

  if (!storedUser || !token || token === 'creator-demo-token') {
    clearSession();
    return null;
  }

  try {
    return { user: JSON.parse(storedUser), token };
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(user, token) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.token, token);
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.token);
}

export async function fetchCategories() {
  const response = await api.get('/categories');
  return ['All', ...response.data.filter(Boolean)];
}

export async function fetchPosts() {
  const response = await api.get('/posts');
  return response.data;
}

export async function fetchPost(postId) {
  const response = await api.get(`/posts/${postId}`);
  return response.data;
}

export async function fetchManagedComments() {
  const response = await api.get('/posts/comments/manage');
  return response.data;
}

export async function authenticate({ mode, name, email, password }) {
  const response = mode === 'register'
    ? await api.post('/auth/register', { name, email, password })
    : await api.post('/auth/login', { email, password });
  return response.data;
}

export async function createCategory(name) {
  await api.post('/categories', { name });
}

export async function createPost(post) {
  await api.post('/posts', { ...post, status: 'published' });
}

export async function togglePostLike(postId) {
  const response = await api.post(`/posts/${postId}/likes`);
  return response.data;
}

export async function togglePostFavorite(postId) {
  const response = await api.post(`/posts/${postId}/favorites`);
  return response.data;
}

export async function createComment(postId, body, parentId = null) {
  const response = await api.post(`/posts/${postId}/comments`, { body, parentId });
  return response.data;
}

export async function removeComment(commentId) {
  await api.delete(`/comments/${commentId}`);
}
