export interface File {
    id: number;
    filename: string;
    is_public: boolean;
    file_path: string;
    file_size: number;
    owner_id: number;
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