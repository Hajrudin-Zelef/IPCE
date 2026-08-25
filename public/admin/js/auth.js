let currentUser = null;

export function getUser() {
  return currentUser;
}

export async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      window.location.href = '/';
      return null;
    }
    const data = await res.json();
    if (data.user.must_change_password) {
      window.location.href = '/';
      return null;
    }
    if (data.user.role !== 'admin') {
      window.location.href = '/dashboard.html';
      return null;
    }
    currentUser = data.user;
    return currentUser;
  } catch {
    window.location.href = '/';
    return null;
  }
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
}
