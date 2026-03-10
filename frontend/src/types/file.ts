export interface File {
    id: number;
    filename: string;
    is_public: boolean;
    file_path: string;
    file_size: number;
    owner_id: number;
    folder_id: number | null;
    created_at: string;
  }
  
  export interface FileCreate {
    filename: string;
    is_public: boolean;
    file_path: string;
    file_size: number;
  }
  
  export interface FileUpdate {
    filename?: string;
    is_public?: boolean;
  }

  export interface Folder {
    id: number;
    name: string;
    owner_id: number;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
  }

  export interface FolderCreate {
    name: string;
    parent_id?: number | null;
  }
