export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
  }
  
  export interface UserCreate extends Omit<User, 'id' | 'created_at'> {
    password: string;
  }