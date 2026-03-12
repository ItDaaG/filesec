import { api } from './client';
import type { File as FileType, Folder } from '../types/file';

export const uploadFile = async (file: File, isPublic: boolean = false, sharedWith: string[] = []): Promise<FileType> => {
  const formData = new FormData();  
  formData.append('file', file);
  formData.append('is_public', String(isPublic));
  sharedWith.forEach((email) => formData.append('share_with', email));

  const { data } = await api.post<FileType>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
};

export const getMyFiles = async (folderId?: number | null, rootOnly?: boolean): Promise<FileType[]> => {
  const params: Record<string, string> = {};
  if (folderId != null) params.folder_id = String(folderId);
  else if (rootOnly) params.root_only = 'true';

  const { data } = await api.get<FileType[]>('/files/', { params });
  return data;
};

export const deleteFile = async (fileId: number): Promise<void> => {
  await api.delete(`/files/${fileId}`);
};

export const getSharedWithMeFiles = async (): Promise<FileType[]> => {
  const { data } = await api.get<FileType[]>('/files/shared-with-me');
  return data;
};

// --- FOLDER API ---

export const getMyFolders = async (parentId?: number | null): Promise<Folder[]> => {
  const params: Record<string, string> = {};
  if (parentId != null) params.parent_id = String(parentId);

  const { data } = await api.get<Folder[]>('/folders/', { params });
  return data;
};

export const createFolder = async (name: string, parentId?: number | null): Promise<Folder> => {
  const { data } = await api.post<Folder>('/folders/', { name, parent_id: parentId ?? null });
  return data;
};

export const deleteFolder = async (folderId: number): Promise<void> => {
  await api.delete(`/folders/${folderId}`);
};
