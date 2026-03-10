import { api } from './client';
import type { File as FileType } from '../types/file';

export const uploadFile = async (file: File, isPublic: boolean = false): Promise<FileType> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_public', String(isPublic));

  const { data } = await api.post<FileType>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

export const getMyFiles = async (): Promise<FileType[]> => {
  const { data } = await api.get<FileType[]>('/files/');
  return data;
};

export const deleteFile = async (fileId: number): Promise<void> => {
  await api.delete(`/files/${fileId}`);
};

export const getSharedWithMeFiles = async (): Promise<FileType[]> => {
  const { data } = await api.get<FileType[]>('/files/shared-with-me');
  return data;
};
