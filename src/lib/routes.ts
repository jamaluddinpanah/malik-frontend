const encode = (value: string | number) => encodeURIComponent(String(value));

export const routes = {
  home: "/",
  search: "/search",
  postAd: "/post-ad",
  login: "/login",
  register: "/register",
  account: "/account",
  admin: "/admin",
  forbidden: "/forbidden",
  listing: (slug: string) => `/listing/${encode(slug)}`,
  api: {
    csrfCookie: "/sanctum/csrf-cookie",
    auth: {
      login: "/api/v1/auth/login",
      logout: "/api/v1/auth/logout",
      register: "/api/v1/auth/register",
      session: "/api/v1/auth/session",
      profile: "/api/v1/auth/profile",
      changePassword: "/api/v1/auth/change-password",
      forgotPassword: "/api/v1/auth/forgot-password",
      resetPassword: "/api/v1/auth/reset-password",
      resendVerification: "/api/v1/auth/email/verification-notification",
    },
    categories: "/api/v1/categories",
    categoryChildren: (category: string | number) =>
      `/api/v1/categories/${encode(category)}/children`,
    categoryBreadcrumbs: (category: string | number) =>
      `/api/v1/categories/${encode(category)}/breadcrumbs`,
    categoryFormSchema: (category: string | number) =>
      `/api/v1/categories/${encode(category)}/form-schema`,
    listings: "/api/v1/listings",
     listing: (id: string | number) => `/api/v1/listings/${encode(id)}`,
     listingSubmit: (id: string | number) => `/api/v1/listings/${encode(id)}/submit`,
     listingPause: (id: string | number) => `/api/v1/listings/${encode(id)}/pause`,
     listingResume: (id: string | number) => `/api/v1/listings/${encode(id)}/resume`,
     listingSold: (id: string | number) => `/api/v1/listings/${encode(id)}/mark-sold`,
     listingArchive: (id: string | number) => `/api/v1/listings/${encode(id)}/archive`,
     listingRestore: (id: string | number) => `/api/v1/listings/${encode(id)}/restore`,
     listingMedia: (id: string | number) => `/api/v1/listings/${encode(id)}/media`,
     listingMediaItem: (listing: string | number, media: string | number) => `/api/v1/listings/${encode(listing)}/media/${encode(media)}`,
     listingMediaCover: (listing: string | number, media: string | number) => `/api/v1/listings/${encode(listing)}/media/${encode(media)}/cover`,
     listingMediaReorder: (id: string | number) => `/api/v1/listings/${encode(id)}/media/reorder`,
    listingBySlug: (slug: string) => `/api/v1/listings/by-slug/${encode(slug)}`,
    myListings: "/api/v1/me/listings",
    admin: {
      dashboard: "/admin/api/v1/dashboard",
      users: "/admin/api/v1/users",
      user: (user: string | number) => `/admin/api/v1/users/${encode(user)}`,
      userStatus: (user: string | number) =>
        `/admin/api/v1/users/${encode(user)}/status`,
      roles: "/admin/api/v1/roles",
      permissions: "/admin/api/v1/permissions",
      rolePermissions: (role: string | number) =>
        `/admin/api/v1/roles/${encode(role)}/permissions`,
      userRoles: (user: string | number) =>
        `/admin/api/v1/users/${encode(user)}/roles`,
      userRole: (user: string | number, role: string | number) =>
        `/admin/api/v1/users/${encode(user)}/roles/${encode(role)}`,
      categories: "/admin/api/v1/categories",
      category: (category: string | number) =>
        `/admin/api/v1/categories/${encode(category)}`,
      categorySchema: (category: string | number) =>
        `/admin/api/v1/categories/${encode(category)}/schema-preview`,
      categoryAttributes: (category: string | number) =>
        `/admin/api/v1/categories/${encode(category)}/attributes`,
      attributes: "/admin/api/v1/attributes",
      attribute: (attribute: string | number) =>
        `/admin/api/v1/attributes/${encode(attribute)}`,
      sections: "/admin/api/v1/sections",
      section: (section: string | number) =>
        `/admin/api/v1/sections/${encode(section)}`,
      options: "/admin/api/v1/options",
      option: (option: string | number) =>
        `/admin/api/v1/options/${encode(option)}`,
    },
  },
} as const;
