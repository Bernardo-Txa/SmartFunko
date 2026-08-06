import "server-only";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export type ReportCompetence = {
  code: string;
  ends_on: string;
  id: string;
  label: string;
  starts_on: string;
  status: string;
};

function endOfDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}

export function getCompetenceRange(competence: ReportCompetence) {
  return {
    from: competence.starts_on,
    label: `${competence.label} (${competence.starts_on} a ${competence.ends_on})`,
    to: endOfDate(competence.ends_on),
  };
}

export class ReportCompetenceService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
  ) {}

  async listCompetencies() {
    const { data, error } = await this.supabase
      .from("v2_order_competencies")
      .select("id,code,label,starts_on,ends_on,status")
      .order("starts_on", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar competencias dos relatorios");
    }

    return (data ?? []) as ReportCompetence[];
  }

  resolveSelected(competencies: ReportCompetence[], competenceId?: string | null) {
    return competenceId
      ? competencies.find((competence) => competence.id === competenceId) ?? null
      : competencies.find((competence) => competence.status === "open") ?? competencies[0] ?? null;
  }
}
