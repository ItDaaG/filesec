export const QUERY_KEYS = {
  files: {
    /** Base key — used for prefix invalidation (invalidates all file queries) */
    all: () => ["files"] as const,
    /** Files scoped to a specific folder (or root when null) */
    byFolder: (folderId: number | null) => ["files", folderId] as const,
  },
  folders: {
    /** Base key — used for prefix invalidation (invalidates all folder queries) */
    all: () => ["folders"] as const,
    /** Folders scoped to a specific parent (or root when null) */
    byParent: (parentId: number | null) => ["folders", parentId] as const,
  },
  storageStats: () => ["storage-stats"] as const,
  sharedFiles: () => ["shared-files"] as const,
  breadcrumbs: (folderId: number | null) => ["breadcrumbs", folderId] as const,
};
