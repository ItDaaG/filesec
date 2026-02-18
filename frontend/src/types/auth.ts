import type { User } from './user';
export interface Token {
    access_token: string;
    token_type: string;
  }
  
  export interface UserLogin {
    email: string;
    password: string;
  }
  
  export interface AuthResponse extends Token {
    user: User;
  }