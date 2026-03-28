import { useEffect, useState } from "react";

import PageAccessNotice from "../components/access/PageAccessNotice";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useVisibility } from "../hooks/useVisibility";
import {
  type AiProvidersSettings,
  type BillingWalletSettings,
  type EmailServicesSettings,
  type EmailServicesTestResult,
  platformSettingsService,
  type GlobalIntegrationsSettings,
  type GlobalIntegrationsTestResult,
  type PlatformSettingsAuditRow,
} from "../services/platformSettingsService";

const SYSTEM_AREAS = [
  {
    title: "Global Integrations",
    description: "Meta app credentials, webhook verification, and shared provider configuration should live here.",
  },
  {
    title: "AI Providers",
    description: "Master OpenAI, Gemini, and model defaults for platform-wide agent and automation behavior.",
  },
  {
    title: "Billing And Wallet",
    description: "Global Stripe, Razorpay, wallet, and subscription configuration for all workspaces.",
  },
  {
    title: "Email Services",
    description: "SMTP or transactional email credentials for invites, resets, and system notifications.",
  },
];

export default function SystemSettingsPage() {
  const { canViewPage } = useVisibility();
  const canViewSystemSettingsPage = canViewPage("system_settings");
  const [globalIntegrations, setGlobalIntegrations] =
    useState<GlobalIntegrationsSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingGlobalIntegrations, setEditingGlobalIntegrations] = useState(false);
  const [savingGlobalIntegrations, setSavingGlobalIntegrations] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [globalIntegrationsLoadError, setGlobalIntegrationsLoadError] = useState("");
  const [emailSettings, setEmailSettings] = useState<EmailServicesSettings | null>(null);
  const [emailLoadError, setEmailLoadError] = useState("");
  const [emailTestResult, setEmailTestResult] = useState<EmailServicesTestResult | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    provider: "smtp",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpFrom: "",
    smtpReplyTo: "",
    testRecipient: "",
    smtpPass: "",
  });
  const [aiProviders, setAiProviders] = useState<AiProvidersSettings | null>(null);
  const [aiLoadError, setAiLoadError] = useState("");
  const [editingAi, setEditingAi] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [aiForm, setAiForm] = useState({
    defaultProvider: "openai",
    defaultModel: "",
    fallbackProvider: "gemini",
    fallbackModel: "",
    openaiModel: "",
    geminiModel: "",
    temperature: "0.2",
    maxOutputTokens: "1024",
    openaiApiKey: "",
    geminiApiKey: "",
  });
  const [billingWallet, setBillingWallet] = useState<BillingWalletSettings | null>(null);
  const [billingWalletLoadError, setBillingWalletLoadError] = useState("");
  const [editingBillingWallet, setEditingBillingWallet] = useState(false);
  const [savingBillingWallet, setSavingBillingWallet] = useState(false);
  const [billingWalletForm, setBillingWalletForm] = useState({
    billingProvider: "hybrid",
    stripePublicKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    billingWebhookUrl: "",
    defaultCurrency: "INR",
    walletAutoTopupDefaultEnabled: false,
    walletAutoTopupDefaultAmount: "0",
    walletLowBalanceThresholdDefault: "0",
  });
  const [testingGlobalIntegrations, setTestingGlobalIntegrations] = useState(false);
  const [globalIntegrationsTestResult, setGlobalIntegrationsTestResult] =
    useState<GlobalIntegrationsTestResult | null>(null);
  const [showGlobalIntegrationsHistory, setShowGlobalIntegrationsHistory] = useState(false);
  const [loadingGlobalIntegrationsHistory, setLoadingGlobalIntegrationsHistory] = useState(false);
  const [globalIntegrationsHistory, setGlobalIntegrationsHistory] = useState<PlatformSettingsAuditRow[]>([]);
  const [globalIntegrationsForm, setGlobalIntegrationsForm] = useState({
    publicApiBaseUrl: "",
    publicAppBaseUrl: "",
    metaAppId: "",
    embeddedSignupConfigId: "",
    metaAppSecret: "",
    legacyVerifyToken: "",
  });

  useEffect(() => {
    if (!canViewSystemSettingsPage) {
      setGlobalIntegrations(null);
      setLoading(false);
      setError("");
      setGlobalIntegrationsLoadError("");
      setEmailLoadError("");
      setAiLoadError("");
      setBillingWalletLoadError("");
      return;
    }

    setLoading(true);
    setError("");
    setGlobalIntegrationsLoadError("");
    setEmailLoadError("");
    setAiLoadError("");
    setBillingWalletLoadError("");
    platformSettingsService
      .getGlobalIntegrations()
      .then((data) => {
        setGlobalIntegrations(data);
        setGlobalIntegrationsForm({
          publicApiBaseUrl: data.editable.publicApiBaseUrl || "",
          publicAppBaseUrl: data.editable.publicAppBaseUrl || "",
          metaAppId: data.editable.metaAppId || "",
          embeddedSignupConfigId: data.editable.embeddedSignupConfigId || "",
          metaAppSecret: "",
          legacyVerifyToken: "",
        });
        setGlobalIntegrationsTestResult(null);
      })
      .catch((err) => {
        console.error("Failed to load global integrations settings", err);
        setGlobalIntegrations(null);
        setGlobalIntegrationsLoadError(err?.response?.data?.error || "Failed to load global integrations settings");
      })
      .finally(() => setLoading(false));

    platformSettingsService.getEmailServices().then((data) => {
      setEmailSettings(data);
      setEmailForm({
        provider: data.editable.provider || "smtp",
        smtpHost: data.editable.smtpHost || "",
        smtpPort: String(data.editable.smtpPort || 587),
        smtpUser: data.editable.smtpUser || "",
        smtpFrom: data.editable.smtpFrom || "",
        smtpReplyTo: data.editable.smtpReplyTo || "",
        testRecipient: data.editable.testRecipient || "",
        smtpPass: "",
      });
    }).catch((err) => {
      console.error("Failed to load email services settings", err);
      setEmailSettings(null);
      setEmailLoadError(err?.response?.data?.error || "Failed to load email services settings");
    });

    platformSettingsService.getAiProviders().then((data) => {
      setAiProviders(data);
      setAiForm({
        defaultProvider: data.editable.defaultProvider || "openai",
        defaultModel: data.editable.defaultModel || "",
        fallbackProvider: data.editable.fallbackProvider || "gemini",
        fallbackModel: data.editable.fallbackModel || "",
        openaiModel: data.editable.openaiModel || "",
        geminiModel: data.editable.geminiModel || "",
        temperature: String(data.editable.temperature ?? 0.2),
        maxOutputTokens: String(data.editable.maxOutputTokens ?? 1024),
        openaiApiKey: "",
        geminiApiKey: "",
      });
    }).catch((err) => {
      console.error("Failed to load AI provider settings", err);
      setAiProviders(null);
      setAiLoadError(err?.response?.data?.error || "Failed to load AI provider settings");
    });

    platformSettingsService.getBillingWallet().then((data) => {
      setBillingWallet(data);
      setBillingWalletForm({
        billingProvider: data.editable.billingProvider || "hybrid",
        stripePublicKey: data.editable.stripePublicKey || "",
        stripeSecretKey: "",
        stripeWebhookSecret: "",
        razorpayKeyId: data.editable.razorpayKeyId || "",
        razorpayKeySecret: "",
        razorpayWebhookSecret: "",
        billingWebhookUrl: data.editable.billingWebhookUrl || "",
        defaultCurrency: data.editable.defaultCurrency || "INR",
        walletAutoTopupDefaultEnabled: Boolean(data.editable.walletAutoTopupDefaultEnabled),
        walletAutoTopupDefaultAmount: String(data.editable.walletAutoTopupDefaultAmount ?? 0),
        walletLowBalanceThresholdDefault: String(data.editable.walletLowBalanceThresholdDefault ?? 0),
      });
    }).catch((err) => {
      console.error("Failed to load billing and wallet settings", err);
      setBillingWallet(null);
      setBillingWalletLoadError(err?.response?.data?.error || "Failed to load billing and wallet settings");
    });
  }, [canViewSystemSettingsPage]);

  const resetGlobalIntegrationsForm = () => {
    setGlobalIntegrationsForm({
      publicApiBaseUrl: globalIntegrations?.editable.publicApiBaseUrl || "",
      publicAppBaseUrl: globalIntegrations?.editable.publicAppBaseUrl || "",
      metaAppId: globalIntegrations?.editable.metaAppId || "",
      embeddedSignupConfigId: globalIntegrations?.editable.embeddedSignupConfigId || "",
      metaAppSecret: "",
      legacyVerifyToken: "",
    });
  };

  const handleGlobalIntegrationsSave = async () => {
    try {
      setSavingGlobalIntegrations(true);
      setError("");
      setFeedback("");
      const next = await platformSettingsService.updateGlobalIntegrations(globalIntegrationsForm);
      setGlobalIntegrations(next);
      setEditingGlobalIntegrations(false);
      setGlobalIntegrationsForm({
        publicApiBaseUrl: next.editable.publicApiBaseUrl || "",
        publicAppBaseUrl: next.editable.publicAppBaseUrl || "",
        metaAppId: next.editable.metaAppId || "",
        embeddedSignupConfigId: next.editable.embeddedSignupConfigId || "",
        metaAppSecret: "",
        legacyVerifyToken: "",
      });
      setFeedback("Global integrations updated.");
    } catch (err: any) {
      console.error("Failed to save global integrations settings", err);
      setError(err?.response?.data?.error || "Failed to save global integrations settings");
    } finally {
      setSavingGlobalIntegrations(false);
    }
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch (err) {
      console.error("Clipboard copy failed", err);
      setError("Clipboard copy failed");
    }
  };

  const handleGlobalIntegrationsTest = async () => {
    try {
      setTestingGlobalIntegrations(true);
      setError("");
      setFeedback("");
      setGlobalIntegrationsTestResult(await platformSettingsService.testGlobalIntegrations());
    } catch (err: any) {
      console.error("Failed to test global integrations", err);
      setError(err?.response?.data?.error || "Failed to test global integrations");
    } finally {
      setTestingGlobalIntegrations(false);
    }
  };

  const handleGlobalVerifyTokenRotate = async () => {
    try {
      setError("");
      setFeedback("");
      const result = await platformSettingsService.regenerateGlobalVerifyToken();
      setGlobalIntegrations(result.settings);
      setFeedback(`Legacy verify token regenerated: ${result.regeneratedToken}`);
    } catch (err: any) {
      console.error("Failed to regenerate verify token", err);
      setError(err?.response?.data?.error || "Failed to regenerate verify token");
    }
  };

  const handleGlobalIntegrationsHistoryToggle = async () => {
    const nextOpen = !showGlobalIntegrationsHistory;
    setShowGlobalIntegrationsHistory(nextOpen);

    if (!nextOpen || globalIntegrationsHistory.length > 0) {
      return;
    }

    try {
      setLoadingGlobalIntegrationsHistory(true);
      setError("");
      setGlobalIntegrationsHistory(await platformSettingsService.listGlobalIntegrationsHistory());
    } catch (err: any) {
      console.error("Failed to load global integrations history", err);
      setError(err?.response?.data?.error || "Failed to load global integrations history");
    } finally {
      setLoadingGlobalIntegrationsHistory(false);
    }
  };

  const handleEmailSave = async () => {
    try {
      setSavingEmail(true);
      const next = await platformSettingsService.updateEmailServices({
        ...emailForm,
        smtpPort: Number(emailForm.smtpPort || 587),
      });
      setEmailSettings(next);
      setEditingEmail(false);
      setEmailForm({
        provider: next.editable.provider || "smtp",
        smtpHost: next.editable.smtpHost || "",
        smtpPort: String(next.editable.smtpPort || 587),
        smtpUser: next.editable.smtpUser || "",
        smtpFrom: next.editable.smtpFrom || "",
        smtpReplyTo: next.editable.smtpReplyTo || "",
        testRecipient: next.editable.testRecipient || "",
        smtpPass: "",
      });
      setFeedback("Email services updated.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save email settings");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleEmailTest = async () => {
    try {
      setTestingEmail(true);
      setEmailTestResult(await platformSettingsService.testEmailServices());
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to test email settings");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleAiSave = async () => {
    try {
      setSavingAi(true);
      const next = await platformSettingsService.updateAiProviders(aiForm);
      setAiProviders(next);
      setEditingAi(false);
      setAiForm({
        defaultProvider: next.editable.defaultProvider || "openai",
        defaultModel: next.editable.defaultModel || "",
        fallbackProvider: next.editable.fallbackProvider || "gemini",
        fallbackModel: next.editable.fallbackModel || "",
        openaiModel: next.editable.openaiModel || "",
        geminiModel: next.editable.geminiModel || "",
        temperature: String(next.editable.temperature ?? 0.2),
        maxOutputTokens: String(next.editable.maxOutputTokens ?? 1024),
        openaiApiKey: "",
        geminiApiKey: "",
      });
      setFeedback("AI provider settings updated.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save AI settings");
    } finally {
      setSavingAi(false);
    }
  };

  const handleBillingWalletSave = async () => {
    try {
      setSavingBillingWallet(true);
      const next = await platformSettingsService.updateBillingWallet({
        ...billingWalletForm,
        walletAutoTopupDefaultAmount: Number(billingWalletForm.walletAutoTopupDefaultAmount || 0),
        walletLowBalanceThresholdDefault: Number(billingWalletForm.walletLowBalanceThresholdDefault || 0),
      });
      setBillingWallet(next);
      setEditingBillingWallet(false);
      setBillingWalletForm({
        billingProvider: next.editable.billingProvider || "hybrid",
        stripePublicKey: next.editable.stripePublicKey || "",
        stripeSecretKey: "",
        stripeWebhookSecret: "",
        razorpayKeyId: next.editable.razorpayKeyId || "",
        razorpayKeySecret: "",
        razorpayWebhookSecret: "",
        billingWebhookUrl: next.editable.billingWebhookUrl || "",
        defaultCurrency: next.editable.defaultCurrency || "INR",
        walletAutoTopupDefaultEnabled: Boolean(next.editable.walletAutoTopupDefaultEnabled),
        walletAutoTopupDefaultAmount: String(next.editable.walletAutoTopupDefaultAmount ?? 0),
        walletLowBalanceThresholdDefault: String(next.editable.walletLowBalanceThresholdDefault ?? 0),
      });
      setFeedback("Billing and wallet settings updated.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save billing settings");
    } finally {
      setSavingBillingWallet(false);
    }
  };

  return (
    <DashboardLayout>
      {!canViewSystemSettingsPage ? (
        <PageAccessNotice
          title="System settings are restricted for this role"
          description="Only platform operators can review global platform configuration areas."
          href="/"
          ctaLabel="Open dashboard"
        />
      ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                System Settings
              </div>
              <h1 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[var(--text)]">
                Platform configuration map
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                This is the platform-only boundary for global configuration. The secure backend endpoints for editing these settings are not wired yet, so this page now acts as the explicit super-admin control map instead of redirecting into workspace settings.
              </p>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {SYSTEM_AREAS.map((area) => (
              <section
                key={area.title}
                className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"
              >
                {area.title === "Global Integrations" ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold tracking-tight text-[var(--text)]">
                        {area.title}
                      </div>
                      <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                        Live status
                      </div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {area.description}
                    </div>
                    {feedback ? (
                      <div className="mt-4 rounded-[1rem] border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-xs leading-5 text-emerald-200">
                        {feedback}
                      </div>
                    ) : null}
                    {globalIntegrationsLoadError ? (
                      <div className="mt-4 rounded-[1rem] border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200">
                        {globalIntegrationsLoadError}
                      </div>
                    ) : loading ? (
                      <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                        Loading live platform integration settings...
                      </div>
                    ) : globalIntegrations ? (
                      <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {!editingGlobalIntegrations ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  resetGlobalIntegrationsForm();
                                  setEditingGlobalIntegrations(true);
                                  setFeedback("");
                                }}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    globalIntegrations.urls.globalWebhookUrl,
                                    "Global webhook URL copied."
                                  )
                                }
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]"
                              >
                                Copy Webhook URL
                              </button>
                              <button
                                type="button"
                                onClick={handleGlobalIntegrationsTest}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]"
                              >
                                {testingGlobalIntegrations ? "Testing..." : "Test Connection"}
                              </button>
                              <button
                                type="button"
                                onClick={handleGlobalVerifyTokenRotate}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]"
                              >
                                Regenerate Verify Token
                              </button>
                              <button
                                type="button"
                                onClick={handleGlobalIntegrationsHistoryToggle}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]"
                              >
                                {showGlobalIntegrationsHistory ? "Hide Audit History" : "View Audit History"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleGlobalIntegrationsSave}
                                disabled={savingGlobalIntegrations}
                                className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                              >
                                {savingGlobalIntegrations ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  resetGlobalIntegrationsForm();
                                  setEditingGlobalIntegrations(false);
                                }}
                                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[
                            [
                              "Meta OAuth",
                              globalIntegrations.readiness.metaOAuthReady ? "Configured" : "Missing app secret or app id",
                              globalIntegrations.readiness.metaOAuthReady,
                            ],
                            [
                              "Embedded signup",
                              globalIntegrations.readiness.metaEmbeddedSignupReady
                                ? "Ready"
                                : "Missing app id or config id",
                              globalIntegrations.readiness.metaEmbeddedSignupReady,
                            ],
                            [
                              "Webhook signature",
                              globalIntegrations.meta.signatureVerificationEnabled ? "Enabled" : "Disabled",
                              globalIntegrations.meta.signatureVerificationEnabled,
                            ],
                            [
                              "Legacy verify token",
                              globalIntegrations.meta.legacyVerifyTokenConfigured ? "Configured" : "Missing",
                              globalIntegrations.meta.legacyVerifyTokenConfigured,
                            ],
                          ].map(([label, value, ok]) => (
                            <div
                              key={String(label)}
                              className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3"
                            >
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                {label}
                              </div>
                              <div
                                className={`mt-2 text-sm font-semibold ${
                                  ok ? "text-emerald-300" : "text-amber-200"
                                }`}
                              >
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                        {globalIntegrationsTestResult ? (
                          <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                              Connection Test
                            </div>
                            <div
                              className={`mt-2 text-sm font-semibold ${
                                globalIntegrationsTestResult.ok ? "text-emerald-300" : "text-amber-200"
                              }`}
                            >
                              {globalIntegrationsTestResult.ok ? "All checks passed" : "Some checks need attention"}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Checked at {new Date(globalIntegrationsTestResult.checkedAt).toLocaleString()}
                            </div>
                            <div className="mt-3 space-y-2">
                              {globalIntegrationsTestResult.checks.map((check) => (
                                <div key={check.key} className="rounded-xl border border-[var(--line)] px-3 py-3 text-xs">
                                  <div className={`font-semibold ${check.ok ? "text-emerald-300" : "text-amber-200"}`}>
                                    {check.label}
                                  </div>
                                  <div className="mt-1 text-[var(--muted)]">{check.detail}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {editingGlobalIntegrations ? (
                          <div className="grid gap-3 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 sm:grid-cols-2">
                            {[
                              ["Public API Base URL", "publicApiBaseUrl", "https://api.example.com"],
                              ["Public App Base URL", "publicAppBaseUrl", "https://app.example.com"],
                              ["Meta App ID", "metaAppId", "Meta app id"],
                              ["Embedded Signup Config ID", "embeddedSignupConfigId", "Embedded signup config id"],
                              ["Meta App Secret", "metaAppSecret", "Leave blank to keep current secret"],
                              ["Legacy Verify Token", "legacyVerifyToken", "Leave blank to keep current token"],
                            ].map(([label, key, placeholder]) => (
                              <label key={String(key)} className="space-y-2">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                  {label}
                                </div>
                                <input
                                  type={String(key).toLowerCase().includes("secret") || String(key).toLowerCase().includes("token") ? "password" : "text"}
                                  value={(globalIntegrationsForm as Record<string, string>)[String(key)]}
                                  onChange={(event) =>
                                    setGlobalIntegrationsForm((current) => ({
                                      ...current,
                                      [key]: event.target.value,
                                    }))
                                  }
                                  placeholder={String(placeholder)}
                                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent-strong)]"
                                />
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 text-xs leading-5 text-[var(--muted)]">
                            <div>
                              <span className="font-semibold text-[var(--text)]">Public API base:</span>{" "}
                              {globalIntegrations.urls.publicApiBaseUrl}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">Global webhook URL:</span>{" "}
                              {globalIntegrations.urls.globalWebhookUrl}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">Meta OAuth callback:</span>{" "}
                              {globalIntegrations.urls.metaOAuthCallbackUrl}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">App base URL:</span>{" "}
                              {globalIntegrations.urls.publicAppBaseUrl}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">Integrations app route:</span>{" "}
                              {globalIntegrations.urls.integrationsAppUrl}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">Meta App ID:</span>{" "}
                              {globalIntegrations.meta.appIdPreview || "Not configured"}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">Embedded Signup Config:</span>{" "}
                              {globalIntegrations.meta.embeddedSignupConfigIdPreview || "Not configured"}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text)]">Legacy Verify Token:</span>{" "}
                              {globalIntegrations.meta.legacyVerifyTokenPreview || "Not configured"}
                            </div>
                          </div>
                        )}
                        {showGlobalIntegrationsHistory ? (
                          <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                              Recent Audit History
                            </div>
                            <div className="mt-3 space-y-2">
                              {loadingGlobalIntegrationsHistory ? (
                                <div className="text-xs text-[var(--muted)]">Loading history...</div>
                              ) : globalIntegrationsHistory.length ? (
                                globalIntegrationsHistory.map((row) => (
                                  <div key={row.id} className="rounded-xl border border-[var(--line)] px-3 py-3 text-xs">
                                    <div className="font-semibold text-[var(--text)]">
                                      {row.action} {row.entity}
                                    </div>
                                    <div className="mt-1 text-[var(--muted)]">
                                      {row.actor_user_name || row.actor_user_email || row.user_name || row.user_email || "Unknown actor"} •{" "}
                                      {new Date(row.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-[var(--muted)]">No audit history yet.</div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                        No live global integration data is available yet.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {area.title === "Email Services" && (emailSettings || emailLoadError) ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold tracking-tight text-[var(--text)]">{area.title}</div>
                          <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                            {emailSettings?.status.configured ? "Configured" : "Needs setup"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{area.description}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!editingEmail ? (
                            <>
                              <button type="button" onClick={() => setEditingEmail(true)} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">Edit</button>
                              <button type="button" onClick={handleEmailTest} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">{testingEmail ? "Testing..." : "Test SMTP"}</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={handleEmailSave} disabled={savingEmail} className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">{savingEmail ? "Saving..." : "Save"}</button>
                              <button type="button" onClick={() => setEditingEmail(false)} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">Cancel</button>
                            </>
                          )}
                        </div>
                        {emailLoadError ? (
                          <div className="mt-4 rounded-[1rem] border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200">
                            {emailLoadError}
                          </div>
                        ) : editingEmail ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                              ["Provider", "provider", "smtp"],
                              ["SMTP Host", "smtpHost", "smtp.example.com"],
                              ["SMTP Port", "smtpPort", "587"],
                              ["SMTP User", "smtpUser", "user@example.com"],
                              ["SMTP From", "smtpFrom", "noreply@example.com"],
                              ["SMTP Reply-To", "smtpReplyTo", "support@example.com"],
                              ["Test Recipient", "testRecipient", "ops@example.com"],
                              ["SMTP Password", "smtpPass", "Leave blank to keep current password"],
                            ].map(([label, key, placeholder]) => (
                              <label key={String(key)} className="space-y-2">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
                                <input type={String(key).includes("Pass") ? "password" : "text"} value={(emailForm as Record<string, string>)[String(key)]} onChange={(event) => setEmailForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={String(placeholder)} className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]" />
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                            Provider: {emailSettings?.status.provider || "smtp"}<br />
                            Host: {emailSettings?.previews.smtpHost || "Not configured"}<br />
                            Port: {emailSettings?.previews.smtpPort || 587}<br />
                            User: {emailSettings?.previews.smtpUser || "Not configured"}<br />
                            From: {emailSettings?.previews.smtpFrom || "Not configured"}<br />
                            Reply-To: {emailSettings?.previews.smtpReplyTo || "Not configured"}<br />
                            Test recipient: {emailSettings?.previews.testRecipient || "Not configured"}<br />
                            Password: {emailSettings?.previews.smtpPassConfigured ? "Configured" : "Missing"}
                          </div>
                        )}
                        {emailTestResult ? (
                          <div className={`mt-4 rounded-[1rem] border px-4 py-3 text-xs ${emailTestResult.ok ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200" : "border-amber-300/30 bg-amber-500/10 text-amber-200"}`}>
                            {emailTestResult.detail}
                          </div>
                        ) : null}
                      </>
                    ) : area.title === "AI Providers" && (aiProviders || aiLoadError) ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold tracking-tight text-[var(--text)]">{area.title}</div>
                          <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                            {aiProviders?.status.defaultProvider || "unknown"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{area.description}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!editingAi ? (
                            <button type="button" onClick={() => setEditingAi(true)} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">Edit</button>
                          ) : (
                            <>
                              <button type="button" onClick={handleAiSave} disabled={savingAi} className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">{savingAi ? "Saving..." : "Save"}</button>
                              <button type="button" onClick={() => setEditingAi(false)} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">Cancel</button>
                            </>
                          )}
                        </div>
                        {aiLoadError ? (
                          <div className="mt-4 rounded-[1rem] border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200">
                            {aiLoadError}
                          </div>
                        ) : editingAi ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                              ["Default Provider", "defaultProvider", "openai"],
                              ["Default Model", "defaultModel", "gpt-5.4-mini"],
                              ["Fallback Provider", "fallbackProvider", "gemini"],
                              ["Fallback Model", "fallbackModel", "gemini-1.5-pro"],
                              ["OpenAI Model", "openaiModel", "gpt-5.4-mini"],
                              ["Gemini Model", "geminiModel", "gemini-1.5-pro"],
                              ["Temperature", "temperature", "0.2"],
                              ["Max Output Tokens", "maxOutputTokens", "1024"],
                              ["OpenAI API Key", "openaiApiKey", "Leave blank to keep current key"],
                              ["Gemini API Key", "geminiApiKey", "Leave blank to keep current key"],
                            ].map(([label, key, placeholder]) => (
                              <label key={String(key)} className="space-y-2">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
                                <input type={String(key).toLowerCase().includes("apikey") ? "password" : "text"} value={(aiForm as Record<string, string>)[String(key)]} onChange={(event) => setAiForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={String(placeholder)} className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]" />
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                            Default provider: {aiProviders?.status.defaultProvider || "unknown"}<br />
                            Default model: {aiProviders?.editable.defaultModel || "Not configured"}<br />
                            Fallback provider: {aiProviders?.editable.fallbackProvider || "Not configured"}<br />
                            Fallback model: {aiProviders?.editable.fallbackModel || "Not configured"}<br />
                            Temperature: {aiProviders?.editable.temperature ?? 0.2}<br />
                            Max output tokens: {aiProviders?.editable.maxOutputTokens ?? 1024}<br />
                            OpenAI key: {aiProviders?.status.openaiConfigured ? "Configured" : "Missing"}<br />
                            Gemini key: {aiProviders?.status.geminiConfigured ? "Configured" : "Missing"}
                          </div>
                        )}
                      </>
                    ) : area.title === "Billing And Wallet" && (billingWallet || billingWalletLoadError) ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold tracking-tight text-[var(--text)]">{area.title}</div>
                          <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                            {billingWallet?.editable.defaultCurrency || "INR"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{area.description}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!editingBillingWallet ? (
                            <button type="button" onClick={() => setEditingBillingWallet(true)} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">Edit</button>
                          ) : (
                            <>
                              <button type="button" onClick={handleBillingWalletSave} disabled={savingBillingWallet} className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">{savingBillingWallet ? "Saving..." : "Save"}</button>
                              <button type="button" onClick={() => setEditingBillingWallet(false)} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text)]">Cancel</button>
                            </>
                          )}
                        </div>
                        {billingWalletLoadError ? (
                          <div className="mt-4 rounded-[1rem] border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200">
                            {billingWalletLoadError}
                          </div>
                        ) : editingBillingWallet ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                              ["Billing Provider", "billingProvider", "hybrid"],
                              ["Stripe Public Key", "stripePublicKey", "pk_live_..."],
                              ["Stripe Secret Key", "stripeSecretKey", "Leave blank to keep current secret"],
                              ["Stripe Webhook Secret", "stripeWebhookSecret", "whsec_..."],
                              ["Razorpay Key Id", "razorpayKeyId", "rzp_live_..."],
                              ["Razorpay Key Secret", "razorpayKeySecret", "Leave blank to keep current secret"],
                              ["Razorpay Webhook Secret", "razorpayWebhookSecret", "Leave blank to keep current secret"],
                              ["Billing Webhook URL", "billingWebhookUrl", "https://api.example.com/api/billing/webhook"],
                              ["Default Currency", "defaultCurrency", "INR"],
                              ["Wallet Auto Top-up Amount", "walletAutoTopupDefaultAmount", "0"],
                              ["Low Balance Threshold", "walletLowBalanceThresholdDefault", "0"],
                            ].map(([label, key, placeholder]) => (
                              <label key={String(key)} className="space-y-2">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
                                <input type={String(key).toLowerCase().includes("secret") ? "password" : "text"} value={(billingWalletForm as Record<string, string | boolean>)[String(key)] as any} onChange={(event) => setBillingWalletForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={String(placeholder)} className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]" />
                              </label>
                            ))}
                            <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)] sm:col-span-2">
                              <input type="checkbox" checked={billingWalletForm.walletAutoTopupDefaultEnabled} onChange={(event) => setBillingWalletForm((current) => ({ ...current, walletAutoTopupDefaultEnabled: event.target.checked }))} />
                              Enable wallet auto top-up by default
                            </label>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                            Stripe: {billingWallet?.status.stripeConfigured ? "Configured" : "Missing"}<br />
                            Stripe webhook secret: {billingWallet?.status.stripeWebhookSecretConfigured ? "Configured" : "Missing"}<br />
                            Razorpay: {billingWallet?.status.razorpayConfigured ? "Configured" : "Missing"}<br />
                            Razorpay webhook secret: {billingWallet?.status.razorpayWebhookSecretConfigured ? "Configured" : "Missing"}<br />
                            Billing provider: {billingWallet?.status.billingProvider || "hybrid"}<br />
                            Billing webhook URL: {billingWallet?.editable.billingWebhookUrl || "Not configured"}<br />
                            Default currency: {billingWallet?.editable.defaultCurrency || "INR"}<br />
                            Auto top-up default: {billingWallet?.editable.walletAutoTopupDefaultEnabled ? "Enabled" : "Disabled"}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold tracking-tight text-[var(--text)]">
                            {area.title}
                          </div>
                          <div className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                            Read only
                          </div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {area.description}
                        </div>
                        <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                          Configuration editor coming next. This card is informational for now while the secure backend settings APIs are being finalized.
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
