import { useEffect, useMemo, useState } from 'react';
import {
  authenticate,
  clearSession,
  createCategory,
  createComment,
  createPost,
  fetchCategories,
  fetchManagedComments,
  fetchPost,
  fetchPosts,
  getSession,
  removeComment,
  saveSession,
  togglePostFavorite,
  togglePostLike,
} from '../models/ceejayModel';

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function getAuthErrorMessage(error, mode) {
  const responseData = error.response?.data;
  const serverMessage = responseData?.message || responseData?.error;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (Array.isArray(serverMessage) && serverMessage.length) return serverMessage.join(' ');
  if (Array.isArray(responseData?.errors) && responseData.errors.length) {
    return responseData.errors.map((item) => item.message || item).join(' ');
  }

  if (!error.response) {
    return 'Could not reach the server. Check that the backend is running, then try again.';
  }
  if (error.response.status === 429) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (error.response.status >= 500) {
    return `The server could not ${mode === 'register' ? 'create your account' : 'sign you in'} right now. Please try again shortly.`;
  }
  return mode === 'register'
    ? 'We could not create your account. Check your details and try again.'
    : 'We could not sign you in. Check your email and password and try again.';
}

export default function useCeejayController() {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authPrompt, setAuthPrompt] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentStatus, setCommentStatus] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', description: '', category: '', source: 'Original', url: '', thumbnailUrl: '' });
  const [categoryForm, setCategoryForm] = useState('');
  const [commentManager, setCommentManager] = useState([]);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [user, setUser] = useState(() => getSession()?.user || null);

  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      const matchesFavorites = !showFavorites || post.favoritedByMe;
      const searchableContent = [post.title, post.description, post.category, post.source].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && matchesFavorites && (!query || searchableContent.includes(query));
    });
  }, [posts, searchTerm, selectedCategory, showFavorites]);

  useEffect(() => {
    let active = true;

    async function initializeFeed() {
      setPostsLoading(true);
      setPostsError('');
      const [categoryResult, postResult] = await Promise.allSettled([fetchCategories(), fetchPosts()]);

      if (!active) return;

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value);
        setSelectedCategory((current) => categoryResult.value.includes(current) ? current : 'All');
      } else {
        setNotice(getErrorMessage(categoryResult.reason, 'Topics could not be loaded.'));
      }

      if (postResult.status === 'fulfilled') {
        setPosts(postResult.value);
      } else {
        setPostsError(getErrorMessage(postResult.reason, 'Posts could not be loaded. Please try again.'));
      }
      setPostsLoading(false);
    }

    initializeFeed();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    if (user?.role === 'creator') {
      fetchManagedComments()
        .then((comments) => { if (active) setCommentManager(comments); })
        .catch((error) => { if (active) setNotice(getErrorMessage(error, 'Comments could not be loaded.')); });
    } else {
      setCommentManager([]);
    }

    return () => { active = false; };
  }, [user]);

  async function refreshPosts() {
    setPostsLoading(true);
    setPostsError('');
    try {
      setPosts(await fetchPosts());
    } catch (error) {
      setPostsError(getErrorMessage(error, 'Posts could not be loaded. Please try again.'));
    } finally {
      setPostsLoading(false);
    }
  }

  function openAuth(mode = 'login') {
    setAuthMode(mode);
    setAuthError('');
    setAuthPrompt('');
    setAuthOpen(true);
  }

  function requestSignIn(action) {
    if (user) return true;
    setAuthMode('login');
    setAuthError('');
    setAuthPrompt(`Sign in to ${action} and join Ceejay's community.`);
    setAuthOpen(true);
    return false;
  }

  function toggleAuthMode() {
    setAuthMode((mode) => mode === 'login' ? 'register' : 'login');
    setAuthError('');
    setAuthPrompt('');
  }

  function updateAuthForm(nextForm) {
    setAuthForm(nextForm);
    setAuthError('');
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setDashboardOpen(false);
    setSelectedCategory('All');
    setShowFavorites(false);
    setPosts((current) => current.map((post) => ({ ...post, likedByMe: false, favoritedByMe: false })));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (authSubmitting) return;
    const email = authForm.email.trim();
    const name = authForm.name.trim();

    if (!email || !authForm.password) {
      setAuthError('Email and password are required.');
      return;
    }
    if (authMode === 'register' && !name) {
      setAuthError('Display name is required for new accounts.');
      return;
    }

    setAuthSubmitting(true);
    setAuthError('');
    try {
      const session = await authenticate({ mode: authMode, name, email, password: authForm.password });
      saveSession(session.user, session.token);
      setUser(session.user);
      await refreshPosts();
      setDashboardOpen(session.user.role === 'creator');
      setAuthOpen(false);
      setAuthForm({ name: '', email: '', password: '' });
      setAuthError('');
      setAuthPrompt('');
      setNotice(authMode === 'register'
        ? `Your account was created successfully. Welcome, ${session.user.name}!`
        : `You are signed in as ${session.user.name}.`);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, authMode));
    } finally {
      setAuthSubmitting(false);
    }
  }

  function requireViewerLogin() {
    return requestSignIn('like or comment');
  }

  async function openPost(postId) {
    try {
      const post = await fetchPost(postId);
      setSelectedPost(post);
      setPosts((current) => current.map((item) => (item._id || item.id) === postId
        ? {
          ...item,
          views: post.views,
          likesCount: post.likesCount,
          likedByMe: post.likedByMe,
          favoritedByMe: post.favoritedByMe,
        }
        : item));
      setCommentDraft('');
      setCommentStatus(null);
    } catch (error) {
      setNotice(getErrorMessage(error, 'This post could not be opened. Please try again.'));
    }
  }

  async function handleLike(postId) {
    if (!requireViewerLogin()) return;
    try {
      const result = await togglePostLike(postId);
      const update = (post) => post._id === postId
        ? { ...post, likedByMe: result.likedByMe, likesCount: result.likesCount }
        : post;
      setPosts((current) => current.map(update));
      setSelectedPost((current) => current?._id === postId ? update(current) : current);
    } catch (error) {
      setNotice(getErrorMessage(error, 'Unable to update your reaction.'));
    }
  }

  async function handleFavorite(postId) {
    if (!requestSignIn('save posts to your favorites')) return;
    try {
      const result = await togglePostFavorite(postId);
      const update = (post) => (post._id || post.id) === postId
        ? { ...post, favoritedByMe: result.favoritedByMe }
        : post;
      setPosts((current) => current.map(update));
      setSelectedPost((current) => current?._id === postId ? update(current) : current);
    } catch (error) {
      setNotice(getErrorMessage(error, 'Unable to update your favorites.'));
    }
  }

  function openFavorites() {
    if (!user) {
      requestSignIn('view your favorites');
      return;
    }
    setSelectedCategory('All');
    setShowFavorites(true);
    setDashboardOpen(false);
  }

  async function handleComment(postId) {
    const body = commentDraft.trim();
    if (!requireViewerLogin() || commentSubmitting) return;
    if (!body) {
      setCommentStatus({ type: 'error', message: 'Write a comment before posting.' });
      return;
    }

    setCommentSubmitting(true);
    setCommentStatus(null);
    try {
      const comment = await createComment(postId, body);
      setSelectedPost((current) => current?._id === postId
        ? {
          ...current,
          comments: [...(current.comments || []), comment],
          commentsCount: (current.commentsCount ?? current.comments?.length ?? 0) + 1,
        }
        : current);
      if (user?.role === 'creator') {
        setCommentManager((current) => [...current, {
          ...comment,
          postId,
          postTitle: selectedPost?.title || 'Post',
        }]);
      }
      setPosts((current) => current.map((post) => (post._id || post.id) === postId
        ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
        : post));
      setCommentDraft('');
      setCommentStatus({ type: 'success', message: 'Comment posted. It is now visible on this post.' });
    } catch (error) {
      const message = error.response?.data?.message
        || (!error.response
          ? 'Could not reach the server. Your comment was not posted; check your connection and try again.'
          : 'Unable to post your comment. Please try again.');
      setCommentStatus({ type: 'error', message });
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleReply(postId, parentId, body) {
    if (!requestSignIn('reply')) return false;
    try {
      const reply = await createComment(postId, body, parentId);
      setSelectedPost((current) => current?._id === postId
        ? {
          ...current,
          comments: current.comments.map((comment) => (comment.id || comment._id) === parentId
            ? { ...comment, replies: [...(comment.replies || []), reply] }
            : comment),
          commentsCount: (current.commentsCount || current.comments?.length || 0) + 1,
        }
        : current);
      setPosts((current) => current.map((post) => (post._id || post.id) === postId
        ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
        : post));
      if (user?.role === 'creator') {
        setCommentManager((current) => [...current, {
          ...reply,
          postId,
          postTitle: selectedPost?.title || 'Post',
        }]);
      }
      return true;
    } catch (error) {
      setNotice(getErrorMessage(error, 'Unable to post your reply.'));
      return false;
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    if (user?.role !== 'creator') return;
    const name = categoryForm.trim();
    if (!name) return;
    try {
      await createCategory(name);
      setCategoryForm('');
      setCategories(await fetchCategories());
    } catch (error) {
      setNotice(getErrorMessage(error, 'Unable to add this topic.'));
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    if (user?.role !== 'creator') return;
    try {
      await createPost(postForm);
      setPostForm({ title: '', description: '', category: '', source: 'Original', url: '', thumbnailUrl: '' });
      await refreshPosts();
    } catch (error) {
      setNotice(getErrorMessage(error, 'Unable to publish this post.'));
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await removeComment(commentId);
      setCommentManager((current) => current.filter((comment) => comment.id !== commentId && comment.parentId !== commentId));
      setSelectedPost((current) => {
        if (!current) return current;
        const removedThread = current.comments.find((comment) => (comment.id || comment._id) === commentId);
        const removedReply = current.comments.some((comment) => comment.replies?.some((reply) => (reply.id || reply._id) === commentId));
        const removedCount = removedThread ? 1 + (removedThread.replies?.length || 0) : removedReply ? 1 : 0;
        return {
          ...current,
          comments: current.comments
            .filter((comment) => (comment.id || comment._id) !== commentId)
            .map((comment) => ({
              ...comment,
              replies: (comment.replies || []).filter((reply) => (reply.id || reply._id) !== commentId),
            })),
          commentsCount: Math.max(0, (current.commentsCount || 0) - removedCount),
        };
      });
      await refreshPosts();
    } catch (error) {
      setNotice(getErrorMessage(error, 'Unable to remove this comment.'));
    }
  }

  const creatorStats = {
    posts: posts.length,
    comments: commentManager.length,
    categories: Math.max(0, categories.length - 1),
    views: posts.reduce((total, post) => total + (post.views || 0), 0),
  };

  return {
    authError,
    authForm,
    authMode,
    authOpen,
    authPrompt,
    authSubmitting,
    categories,
    categoryForm,
    commentDraft,
    commentStatus,
    commentSubmitting,
    commentManager,
    creatorStats,
    dashboardOpen,
    filteredPosts,
    posts,
    notice,
    postsError,
    postsLoading,
    postForm,
    searchTerm,
    selectedCategory,
    selectedPost,
    user,
    closeAuth: () => setAuthOpen(false),
    closeNotice: () => setNotice(''),
    closePost: () => {
      setSelectedPost(null);
      setCommentStatus(null);
    },
    handleAuthSubmit,
    handleComment,
    handleCreateCategory,
    handleCreatePost,
    handleDeleteComment,
    handleFavorite,
    handleLike,
    handleReply,
    handleLogout,
    openAuth,
    openFavorites,
    openPost,
    requestSignIn,
    refreshPosts,
    setAuthForm,
    toggleAuthMode,
    updateAuthForm,
    setAuthMode,
    setCategoryForm,
    setCommentDraft: (value) => {
      setCommentDraft(value);
      setCommentStatus(null);
    },
    setDashboardOpen,
    setPostForm,
    setSearchTerm,
    setSelectedCategory,
    setShowFavorites,
    showFavorites,
    setSelectedPost,
    setNotice,
  };
}
