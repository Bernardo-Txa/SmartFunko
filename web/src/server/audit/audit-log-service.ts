import "server-only";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export type AuditLogInput = {
  adminId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

export class AuditLogService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async createAdminActionLog(input: AuditLogInput) {
    const { error } = await this.supabase.from("admin_action_logs").insert({
      action: input.action,
      admin_id: input.adminId,
      entity_id: input.entityId,
      entity_type: input.entityType,
      new_value: input.newValue ?? null,
      old_value: input.oldValue ?? null,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar log administrativo");
    }
  }
}
