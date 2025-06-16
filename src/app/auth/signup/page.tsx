import { AuthForm } from "@/components/forms/AuthForm";
import { signUpWithEmail } from "@/actions/auth";

export default function SignupPage() {
  return <AuthForm action={signUpWithEmail} mode="signup" />;
}
