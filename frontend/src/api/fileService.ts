import { api } from './client';
import type { File as FileType, Folder, SharedUser, ShareResult } from '../types/file';

export const uploadFile = async (
  file: File,
  isPublic: boolean = false,
  sharedWith: string[] = [],
  folderId?: string | null,
): Promise<FileType> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_public', String(isPublic));
  sharedWith.forEach((email) => formData.append('share_with', email));
  if (folderId != null) formData.append('folder_id', folderId);

  const { data } = await api.post<FileType>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
};

export const getMyFiles = async (folderId?: string | null, rootOnly?: boolean): Promise<FileType[]> => {
  const params: Record<string, string> = {};
  if (folderId != null) params.folder_id = folderId;
  else if (rootOnly) params.root_only = 'true';

  const { data } = await api.get<FileType[]>('/files/', { params });
  return data;
};

export const deleteFile = async (fileId: string): Promise<void> => {
  await api.delete(`/files/${fileId}`);
};

export const getSharedWithMeFiles = async (): Promise<FileType[]> => {
  const { data } = await api.get<FileType[]>('/files/shared-with-me');
  return data;
};

export const getFileById = async (fileId: string): Promise<FileType> => {
  const { data } = await api.get<FileType>(`/files/${fileId}`);
  return data;
};

export const downloadFile = async (fileId: string): Promise<Blob> => {
  const { data } = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
  return data;
};

export const updateFile = async (
  fileId: string,
  data: { filename?: string; is_public?: boolean },
): Promise<FileType> => {
  const { data: result } = await api.patch<FileType>(`/files/${fileId}`, data);
  return result;
};

export const getFilePermissions = async (fileId: string): Promise<SharedUser[]> => {
  const { data } = await api.get<SharedUser[]>(`/files/${fileId}/permissions`);
  return data;
};

export const shareFile = async (fileId: string, emails: string[]): Promise<ShareResult> => {
  const { data } = await api.post<ShareResult>(`/files/${fileId}/share`, { emails });
  return data;
};

export const revokeFileShare = async (fileId: string, userId: number): Promise<void> => {
  await api.delete(`/files/${fileId}/share/${userId}`);
};

// --- FOLDER API ---

export const getMyFolders = async (parentId?: string | null): Promise<Folder[]> => {
  const params: Record<string, string> = {};
  if (parentId != null) params.parent_id = parentId;

  const { data } = await api.get<Folder[]>('/folders/', { params });
  return data;
};

export const createFolder = async (name: string, parentId?: string | null): Promise<Folder> => {
  const { data } = await api.post<Folder>('/folders/', { name, parent_id: parentId ?? null });
  return data;
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  await api.delete(`/folders/${folderId}`);
};

export const getFolderById = async (folderId: string): Promise<Folder> => {
  const { data } = await api.get<Folder>(`/folders/${folderId}`);
  return data;
};

export const updateFolder = async (
  folderId: string,
  body: { name?: string; parent_id?: string | null },
): Promise<Folder> => {
  const { data } = await api.patch<Folder>(`/folders/${folderId}`, body);
  return data;
};

// --- FOLDER SHARING API ---

export const getSharedWithMeFolders = async (): Promise<Folder[]> => {
  const { data } = await api.get<Folder[]>('/folders/shared-with-me');
  return data;
};

export const getFolderPermissions = async (folderId: string): Promise<SharedUser[]> => {
  const { data } = await api.get<SharedUser[]>(`/folders/${folderId}/permissions`);
  return data;
};

export const shareFolder = async (folderId: string, emails: string[]): Promise<ShareResult> => {
  const { data } = await api.post<ShareResult>(`/folders/${folderId}/share`, { emails });
  return data;
};

export const revokeFolderShare = async (folderId: string, userId: number): Promise<void> => {
  await api.delete(`/folders/${folderId}/share/${userId}`);
};

// e.g. folderId = "uuid-of-child" → [{ id: "uuid-of-parent", name: "Work" }, { id: "uuid-of-child", name: "Reports" }]
export const buildBreadcrumbs = async (
  folderId: string
): Promise<{ id: string; name: string }[]> => {
  const crumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId !== null) {
    const folder = await getFolderById(currentId);
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_id;
  }

  return crumbs;
};
