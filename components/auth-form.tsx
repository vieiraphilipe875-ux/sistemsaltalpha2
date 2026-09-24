"use client";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, ArrowLeft, LoaderCircle } from "lucide-react";
import { professionLabels } from "@/lib/permissions";
import { VERIFICATION_CODE_TTL_MINUTES } from "@/lib/auth-policy";
import { useHydrated } from "@/lib/use-hydrated";
export function AuthForm({
  initialView = "login",
  invite = "",
  resetId = "",
  resetToken = "",
}: {
  initialView?: "login" | "signup" | "verify" | "forgot" | "reset";
  invite?: string;
  resetId?: string;
  resetToken?: string;
}) {
  const hydrated = useHydrated();
  const [view, setView] = useState(initialView),
    [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [profession, setProfession] = useState("designer"),
    [code, setCode] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function call(action: string, body: object) {
    const response = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Não foi possível concluir.");
    return result;
  }
  function change(next: typeof view) {
    setView(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmation("");
    setCode("");
    setVisible(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if ((view === "signup" || view === "reset") && password !== confirmation)
        throw new Error("As senhas precisam ser iguais.");
      const body =
        view === "signup"
          ? { name, email, password, profession }
          : view === "verify"
            ? { email, code }
            : view === "reset"
              ? { id: resetId, token: resetToken, password }
              : view === "forgot"
                ? { email }
                : { email, password };
      const result = await call(view, body);
      if (view === "login" || view === "verify")
        window.location.assign(
          invite ? `/?invite=${encodeURIComponent(invite)}` : "/",
        );
      else if (view === "signup") {
        change("verify");
        setMessage(
          result.emailStatus === "accepted"
            ? "Código encaminhado para o seu e-mail. Confira sua caixa de entrada."
            : result.message ||
                "Solicite um código abaixo para continuar a confirmação.",
        );
      } else if (view === "reset") {
        change("login");
        setMessage("Senha alterada. Entre com sua nova senha.");
      } else if (view === "forgot" && result.nextStep === "signup") {
        change("signup");
        setMessage(result.message);
      } else setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: [
      "Seu próximo dia começa organizado.",
      "Entre para encontrar sua equipe, seus clientes e o que precisa acontecer.",
    ],
    signup: [
      "Um lugar para o seu trabalho.",
      "Crie sua conta. Você poderá participar de várias agências com o mesmo e-mail.",
    ],
    verify: [
      "Confirme seu e-mail.",
      `Use o código de 6 dígitos recebido por e-mail. Ele vale por ${VERIFICATION_CODE_TTL_MINUTES} minutos após o envio. Ainda não recebeu? Solicite um código abaixo.`,
    ],
    forgot: [
      "Vamos recuperar seu acesso.",
      "Informe o e-mail do seu cadastro para receber o link de redefinição de senha. Confira também a pasta de spam.",
    ],
    reset: [
      "Uma nova senha. Um novo acesso.",
      "Escolha uma senha com pelo menos 10 caracteres.",
    ],
  };
  return (
    <form className="auth-form" method="post" onSubmit={submit} aria-busy={!hydrated || busy}>
      <p className="eyebrow">
        {view === "signup" ? "CRIE SUA CONTA" : "BEM-VINDO AO POSTITO"}
      </p>
      <h1>{titles[view][0]}</h1>
      <p className="auth-intro">{titles[view][1]}</p>
      {invite && (
        <p className="notice">
          Você tem um convite. Entre ou crie uma conta para aceitá-lo.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {view === "signup" && (
        <label>
          Seu nome
          <input
            name="name"
            disabled={!hydrated || busy}
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </label>
      )}
      {view !== "reset" && (
        <label>
          E-mail
          <input
            name="email"
            disabled={!hydrated || busy}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {view === "signup" && (
        <label>
          Sua profissão
          <select
            name="profession"
            disabled={!hydrated || busy}
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
          >
            {Object.entries(professionLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <small>
            Profissão e permissões de acesso são escolhas independentes.
          </small>
        </label>
      )}
      {!["verify", "forgot"].includes(view) && (
        <label>
          Senha
          <span className="password-field">
            <input
              name="password"
              disabled={!hydrated || busy}
              type={visible ? "text" : "password"}
              autoComplete={
                view === "login" ? "current-password" : "new-password"
              }
              minLength={view === "login" ? 1 : 10}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              disabled={!hydrated || busy}
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={visible}
            >
              {visible ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </span>
        </label>
      )}
      {(view === "signup" || view === "reset") && (
        <label>
          Confirmar senha
          <input
            name="confirmation"
            disabled={!hydrated || busy}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            minLength={10}
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
      )}
      {view === "verify" && (
        <label>
          Código de confirmação
          <input
            className="otp"
            name="code"
            disabled={!hydrated || busy}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").replace(/\s/g, "");
              if (/^\d{6}$/.test(pasted)) {
                e.preventDefault();
                setCode(pasted);
              }
            }}
          />
        </label>
      )}
      {view === "login" && (
        <div className="auth-help-links">
          <button
            className="text-action"
            type="button"
            disabled={!hydrated || busy}
            onClick={() => change("verify")}
          >
            Confirmar meu e-mail
          </button>
          <button
            className="text-action"
            type="button"
            disabled={!hydrated || busy}
            onClick={() => change("forgot")}
          >
            Esqueci minha senha
          </button>
        </div>
      )}
      <button type="submit" className="primary-action" disabled={!hydrated || busy}>
        {busy
          ? "Aguarde..."
          : {
              login: "Entrar",
              signup: "Criar minha conta",
              verify: "Confirmar e continuar",
              forgot: "Enviar link",
              reset: "Salvar nova senha",
            }[view]}
        {busy ? (
          <LoaderCircle
            size={18}
            className="auth-loading-icon"
            aria-hidden="true"
          />
        ) : (
          <ArrowRight size={18} aria-hidden="true" />
        )}
      </button>
      {view === "verify" && (
        <button
          className="text-action"
          type="button"
          disabled={!hydrated || busy || !email}
          onClick={async () => {
            setBusy(true);
            setError("");
            setMessage("");
            setCode("");
            try {
              const r = await call("resend", { email });
              setMessage(r.message);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Solicitar código
        </button>
      )}
      {view === "verify" && (
        <button
          className="text-action"
          type="button"
          disabled={!hydrated || busy}
          onClick={() => change("signup")}
        >
          Ainda não tenho cadastro
        </button>
      )}
      {view === "signup" && (
        <button
          className="text-action"
          type="button"
          disabled={!hydrated || busy}
          onClick={() => change("verify")}
        >
          Já comecei o cadastro: confirmar e-mail
        </button>
      )}
      <div className="auth-footer">
        {view === "login" ? (
          <>
            Ainda não tem conta?{" "}
            <button
              type="button"
              className="text-action"
              disabled={!hydrated || busy}
              onClick={() => change("signup")}
            >
              Começar agora
            </button>
          </>
        ) : (
          <button
            className="text-action"
            type="button"
            disabled={!hydrated || busy}
            onClick={() => change("login")}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Voltar para entrar
          </button>
        )}
      </div>
    </form>
  );
}
