// ===============================
// AUTH & AUTHORIZATION (FINAL)
// ===============================

// Role permissions mapping
const PERMISSIONS = {
  admin: ['dashboard.html', 'index.html', 'approval.html', 'done.html', 'rekap.html', 'rejected.html', 'print.html'],
  viewer: ['index.html', 'print.html'],
  staff_a: ['index.html', 'rekap.html', 'rejected.html', 'print.html'],
  staff_b: ['index.html', 'approval.html', 'done.html', 'rekap.html', 'print.html'],
  staff_c: ['dashboard.html', 'index.html', 'approval.html', 'done.html', 'rekap.html', 'rejected.html', 'print.html']
};

// Role display names

// Normalize role
function normalizeRole(role) {
  if (!role) return 'viewer';
  return role.toLowerCase().trim().replace(/ /g, '_');
}

// Check login
function checkAuth() {
  if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Check permission (AMAN)
function checkPermission() {
  if (!checkAuth()) return false;

  const rawRole = sessionStorage.getItem('userRole');
  const role = normalizeRole(rawRole);

  let page = window.location.pathname.split('/').pop();
  if (!page) page = 'index.html';

  const allowed = PERMISSIONS[role] || [];

  if (!allowed.includes(page)) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// User info
function getCurrentUser() {
  const role = normalizeRole(sessionStorage.getItem('userRole'));
  return {
    username: sessionStorage.getItem('username') || 'User',
    role,
    roleName: ROLE_NAMES[role] || role
  };
}

// Logout
function logout() {
  if (confirm('Logout sekarang?')) {
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.includes('login.html')) return;
  checkPermission();
});
