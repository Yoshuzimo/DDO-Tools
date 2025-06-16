import { AuthForm } from "@/components/forms/AuthForm";
import { loginWithEmail } from "@/actions/auth";

export default function LoginPage() {
  return <AuthForm action={loginWithEmail} mode="login" />;
}
