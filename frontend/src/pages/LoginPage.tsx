import { AuthLayout } from "@/components/layouts/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const LoginPage = () => {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
};
