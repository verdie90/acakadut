import { AuthProvider } from "@/contexts/auth-context";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
        <RegisterForm />
      </div>
    </AuthProvider>
  );
}
