import Link from "next/link";

import { useVisibility } from "../../hooks/useVisibility";

type ActiveSlug = "" | "billing" | "overrides" | "members-access" | "support-access";

export default function WorkspaceConsoleTabs({
  workspaceId,
  activeSlug,
}: {
  workspaceId: string;
  activeSlug: ActiveSlug;
}) {
  const {
    canManagePermissions,
    canManageUsers,
    canViewBilling,
    isPlatformOperator,
  } = useVisibility();

  const tabs = [
    { label: "Overview", slug: "" as const, visible: true },
    {
      label: "Billing & Wallet",
      slug: "billing" as const,
      visible: isPlatformOperator || canViewBilling,
    },
    {
      label: "Limits & Overrides",
      slug: "overrides" as const,
      visible: isPlatformOperator || canViewBilling,
    },
    {
      label: "Team & Members",
      slug: "members-access" as const,
      visible: isPlatformOperator || canManageUsers || canManagePermissions,
    },
    {
      label: "Support Access",
      slug: "support-access" as const,
      visible: isPlatformOperator,
    },
  ].filter((tab) => tab.visible || tab.slug === activeSlug);

  return (
    <section className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const href = tab.slug
            ? `/workspaces/${workspaceId}/${tab.slug}`
            : `/workspaces/${workspaceId}`;
          const active = tab.slug === activeSlug;

          return (
            <Link
              key={tab.label}
              href={href}
              className={`rounded-[1rem] px-4 py-2 text-sm transition duration-200 ${
                active
                  ? "border border-[rgba(129,140,248,0.35)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-sm"
                  : "border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--text)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
