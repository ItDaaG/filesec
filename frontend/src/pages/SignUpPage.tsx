import { AuthLayout } from "@/components/layouts/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const SignUpPage = () => {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  );
};