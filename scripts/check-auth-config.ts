import "dotenv/config";
import { publicAuthConfig } from "../server/_core/supabase";
const config = publicAuthConfig();
if (!config) {
  console.log(JSON.stringify({ configured: false }));
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(8000),
    });
    const data = response.ok ? await response.json() : {};
    console.log(JSON.stringify({
      configured: true, reachable: response.ok, httpStatus: response.status,
      emailPasswordEnabled: data.external?.email === true,
      emailConfirmationRequired: data.mailer_autoconfirm === false,
      signupEnabled: data.disable_signup === false,
      // SMTP credentials and allowed redirects are not exposed by this public API.
      smtpAndRedirectsVerified: false,
    }));
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ configured: true, reachable: false }));
    process.exitCode = 1;
  }
}