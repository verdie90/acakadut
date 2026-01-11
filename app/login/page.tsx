import { AuthProvider } from "@/contexts/auth-context";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
        <LoginForm />
      </div>
    </AuthProvider>
  );
}
