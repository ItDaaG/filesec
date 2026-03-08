export interface User {
    id: number;
    username: string;
    email: string;
    account_tier: string;
    created_at: string;
  }
  
  export interface UserCreate extends Omit<User, 'id' | 'created_at' | 'account_tier'> {
    password: string;
  }