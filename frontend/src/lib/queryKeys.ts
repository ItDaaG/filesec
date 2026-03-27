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
  sharedFiles: () => ["shared-files"] as const,
  sharedFolders: () => ["shared-folders"] as const,
  breadcrumbs: (folderId: string | null) => ["breadcrumbs", folderId] as const,
  fileById: (fileId: string) => ["file", fileId] as const,
  fileBlob: (fileId: string) => ["file-blob", fileId] as const,
  filePermissions: (fileId: string) => ["file-permissions", fileId] as const,
  folderPermissions: (folderId: string) => ["folder-permissions", folderId] as const,
};
