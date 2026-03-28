export const QUERY_KEYS = {
  files: {
    /** Base key — used for prefix invalidation (invalidates all file queries) */
    all: () => ["files"] as const,
    /** Files scoped to a specific folder (or root when null) */
    byFolder: (folderId: string | null) => ["files", folderId] as const,
  },
  folders: {
    /** Base key — used for prefix invalidation (invalidates all folder queries) */
    all: () => ["folders"] as const,
    /** Folders scoped to a specific parent (or root when null) */
    byParent: (parentId: string | null) => ["folders", parentId] as const,
  },
  storageStats: () => ["storage-stats"] as const,
  /** Full shared file list (e.g. dashboard widget) */
  sharedFilesAll: () => ["shared-files", "all"] as const,
  /** Shared files scoped like GET /files/ — null = root (root_only), else folder contents */
  sharedFilesByFolder: (folderId: string | null) => ["shared-files", folderId ?? "root"] as const,
  /** Shared folders scoped like GET /folders/ — null = shared root row, else children of parent */
  sharedFoldersByParent: (parentId: string | null) => ["shared-folders", parentId ?? "root"] as const,
  breadcrumbs: (folderId: string | null) => ["breadcrumbs", folderId] as const,
  fileById: (fileId: string) => ["file", fileId] as const,
  fileBlob: (fileId: string) => ["file-blob", fileId] as const,
  filePermissions: (fileId: string) => ["file-permissions", fileId] as const,
  folderPermissions: (folderId: string) => ["folder-permissions", folderId] as const,
};
