export interface File {
    id: string;
    filename: string;
    mime_type: string | null;
    is_public: boolean;
    file_path: string;
    file_size: number;
    owner_id: number;
    folder_id: string | null;
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
    id: string;
    name: string;
    owner_id: number;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
  }

  export interface FolderCreate {
    name: string;
    parent_id?: string | null;
  }

  export interface SharedUser {
    id: number;
    email: string;
    username: string;
  }

  export interface ShareResult {
    detail: string;
    shared: string[];
    already_shared: string[];
    not_found: string[];
  }
