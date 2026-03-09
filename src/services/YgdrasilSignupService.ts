export type SignupContactPreference =
  | "whatsapp"
  | "schedule_meeting"
  | "email_only"
  | "ai_agent";

export interface ISignupLeadPayload {
  companyName: string;
  phone: string;
  email: string;
  companyDescription: string;
  contactPreference: SignupContactPreference;
  activationLink: string;
}

export interface IYgdrasilSignupService {
  sendLead(payload: ISignupLeadPayload): Promise<{ success: boolean }>;
}

class YgdrasilSignupService implements IYgdrasilSignupService {
  private readonly signupUrl: string;
  private readonly headerAuth: string;

  constructor() {
    const envUrl = import.meta.env.VITE_YGDRASIL_SIGNUP_URL;
    if (envUrl) {
      this.signupUrl = envUrl;
    } else {
      const base =
        import.meta.env.VITE_YGDRASIL_API_URL ||
        "https://yggdrasil.artemisdigital.tech";
      const origin = base.startsWith("http") ? new URL(base).origin : base;
      this.signupUrl = `${origin}/webhook/signup-lead`;
    }
    this.headerAuth =
      import.meta.env.VITE_YGDRASIL_SIGNUP_HEADER_AUTH ||
      "177d0c3561c52bbb05e53e1647af6bcf6739d802cab0ae701d5d7f0af19276cf";
  }

  async sendLead(payload: ISignupLeadPayload): Promise<{ success: boolean }> {
    try {
      const response = await fetch(this.signupUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          HeaderAuth: this.headerAuth,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { success: true };
    } catch {
      return { success: true };
    }
  }
}

export const ygdrasilSignupService = new YgdrasilSignupService();
