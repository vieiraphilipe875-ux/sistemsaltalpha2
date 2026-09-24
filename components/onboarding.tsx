"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  LogOut,
  Check,
  Layers2,
  LoaderCircle,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { useHydrated } from "@/lib/use-hydrated";

export function Onboarding({
  name,
  invite,
  agencies,
}: {
  name: string;
  invite?: string;
  agencies: { id: string; name: string }[];
}) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  async function act(body: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const r = await response.json();
      if (!response.ok) throw new Error(r.error);
      window.location.assign(r.clientId ? `/?client=${r.clientId}` : "/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="onboarding" aria-busy={!hydrated || busy}>
      <header className="onboarding-brand">
        <Image
          src="/postito-logo.png"
          alt="Postito"
          width={200}
          height={67}
          priority
        />
        <span>
          <Layers2 size={18} aria-hidden="true" />
        </span>
      </header>
      <div className="onboarding-intro">
        <span className="eyebrow">SEU ESPAÇO DE TRABALHO</span>
        <h1>Olá, {name.split(" ")[0]}.</h1>
        <p>
          {invite
            ? "Você recebeu um convite para uma agência. Ao aceitar, os acessos definidos por ela serão vinculados à sua conta."
            : "Crie o espaço da sua agência ou aceite o link de convite enviado pela sua equipe."}
        </p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {invite ? (
        <div className="onboarding-invite">
          <span className="onboarding-invite-icon">
            <Building2 size={25} aria-hidden="true" />
          </span>
          <p>Seu trabalho, conectado à equipe.</p>
          <button
            className="primary-action"
            disabled={!hydrated || busy}
            onClick={() => act({ action: "acceptInvite", token: invite })}
          >
            {busy ? (
              <LoaderCircle
                size={18}
                className="auth-loading-icon"
                aria-hidden="true"
              />
            ) : (
              <Check size={18} aria-hidden="true" />
            )}
            Aceitar convite
          </button>
          <Link className="text-action" href="/">
            Ir para minhas agências
          </Link>
        </div>
      ) : (
        <>
          <form
            className="onboarding-create"
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              const fields = new FormData(e.currentTarget);
              void act({
                action: "createAgency",
                name: String(fields.get("agency") ?? "").trim(),
              });
            }}
          >
            <label>
              Nome da agência
              <input
                name="agency"
                required
                minLength={2}
                maxLength={100}
                disabled={!hydrated || busy}
                placeholder="Como sua agência se chama?"
              />
            </label>
            <button className="primary-action" disabled={!hydrated || busy}>
              {busy ? "Criando agência..." : "Criar agência"}
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
          </form>
          {agencies.length > 0 && (
            <section
              className="onboarding-agencies"
              aria-labelledby="onboarding-agencies-title"
            >
              <h2 id="onboarding-agencies-title">Suas agências</h2>
              <div className="agency-list">
                {agencies.map((a) => (
                  <button
                    key={a.id}
                    disabled={!hydrated || busy}
                    onClick={() =>
                      act({ action: "switchAgency", agencyId: a.id })
                    }
                  >
                    <span className="onboarding-agency-icon">
                      <Building2 size={18} aria-hidden="true" />
                    </span>
                    <span>{a.name}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <footer className="onboarding-footer">
        <p>Uma conta. Cada agência no seu espaço.</p>
        <form action={logout}>
          <button className="text-action" type="submit">
            <LogOut size={15} aria-hidden="true" />
            Sair da conta
          </button>
        </form>
      </footer>
    </div>
  );
}
