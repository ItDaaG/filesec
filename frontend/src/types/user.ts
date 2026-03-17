export interface User {
    id: number;
    username: string;
    email: string;
    account_tier: string;
    is_email_verified: boolean;
    created_at: string;
  }
  
  export interface UserCreate extends Omit<User, 'id' | 'created_at' | 'account_tier' | 'is_email_verified'> {
    password: string;
  }