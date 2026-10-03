export type Account = { id: string; email: string | null; name: string | null; role: "user" };

export function authMessage(error: unknown): string {
  const e = error as { code?: string; status?: number; name?: string };
  if (e?.status === 429 || e?.code?.includes("rate_limit")) return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  if (e?.code === "email_not_confirmed") return "Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.";
  if (e?.code === "invalid_credentials") return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  if (e?.code === "weak_password") return "Escolha uma senha mais forte, com pelo menos 8 caracteres.";
  if (e?.code === "same_password") return "Escolha uma senha diferente da atual.";
  if (e?.code === "otp_expired" || e?.code === "flow_state_expired" || e?.code === "flow_state_not_found") return "Este link expirou ou já foi usado. Solicite um novo link.";
  if (e?.code === "email_address_not_authorized" || e?.code === "unexpected_failure") return "Não foi possível enviar o e-mail. A configuração de envio precisa ser verificada.";
  if (e?.name === "AuthRetryableFetchError" || error instanceof TypeError) return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
  return "Não foi possível concluir. Tente novamente ou solicite um novo link.";
}

export function validateAccess(values: { name?: string; email?: string; password?: string; confirmation?: string }, mode: string) {
  const errors: Record<string, string> = {};
  if (mode === "register" && (!values.name?.trim() || values.name.trim().length < 2)) errors.name = "Informe seu nome (pelo menos 2 caracteres).";
  if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email?.trim() ?? "")) errors.email = "Informe um e-mail válido.";
  if (mode === "login" && !values.password) errors.password = "Informe sua senha.";
  if ((mode === "register" || mode === "reset") && (values.password?.length ?? 0) < 8) errors.password = "Use pelo menos 8 caracteres.";
  if ((mode === "register" || mode === "reset") && values.confirmation !== values.password) errors.confirmation = "As senhas não coincidem.";
  return errors;
}