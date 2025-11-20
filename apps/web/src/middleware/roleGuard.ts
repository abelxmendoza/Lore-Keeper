/**
 * Role Guard Middleware
 * Protects routes based on user roles
 */

const apiEnv = import.meta.env.VITE_API_ENV || import.meta.env.MODE || 'dev';
const adminUserId = import.meta.env.VITE_ADMIN_USER_ID;

/**
 * Check if user has admin role
 */
export const isAdmin = (user: any): boolean => {
  if (!user) return false;
  
  return !!(
    user.user_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'developer' ||
    user.app_metadata?.role === 'admin' ||
    user.app_metadata?.role === 'developer'
  );
};

/**
 * Check if user can access admin console
 */
export const canAccessAdmin = (user: any): boolean => {
  return isAdmin(user);
};

/**
 * Check if user can access dev console
 * Visible only when API_ENV === "dev" OR user.id == ADMIN_ID
 */
export const canAccessDevConsole = (user: any): boolean => {
  if (apiEnv === 'dev') {
    return true;
  }
  
  if (adminUserId && user?.id === adminUserId) {
    return true;
  }
  
  return false;
};

/**
 * Redirect unauthorized users
 */
export const redirectUnauthorized = (path: string = '/') => {
  window.location.href = path;
};

