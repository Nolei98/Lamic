import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: { searchParams: { from?: string } }) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Painel LAMIC</h1>
        <p>Entre com sua conta para acessar o painel.</p>
        <LoginForm from={searchParams?.from || "/admin/dashboard"} />
      </div>
    </div>
  );
}
