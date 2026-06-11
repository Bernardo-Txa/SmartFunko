import "server-only";
import { z } from "zod";
import { isRewardsEnabled } from "@/lib/env";
import { forbidden, notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const rewardLevels = [
  { code: "visitor", label: "Visitante", minPoints: 0 },
  { code: "starter_collector", label: "Colecionador Iniciante", minPoints: 1000 },
  { code: "exclusive_hunter", label: "Caçador de Exclusivos", minPoints: 3000 },
  { code: "funko_master", label: "Mestre dos Funkos", minPoints: 7500 },
  { code: "grail_hunter", label: "Grail Hunter", minPoints: 15000 },
  { code: "smart_elite", label: "Elite Smart", minPoints: 30000 },
  { code: "smart_legend", label: "Lenda Smart", minPoints: 60000 },
  { code: "hall_of_fame", label: "Hall da Fama", minPoints: 100000 },
] as const;

export const updateRewardProfileSchema = z.object({
  publicNickname: z.string().trim().max(80).optional().nullable(),
  showInRankings: z.boolean().optional(),
});

export const updateRankingSchema = z.object({
  firstPlaceReward: z.string().trim().max(500).optional().nullable(),
  secondPlaceReward: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["open", "closed", "awarded", "cancelled"]).optional(),
  thirdPlaceReward: z.string().trim().max(500).optional().nullable(),
});

export const updateRankingEntrySchema = z.object({
  rewardNotes: z.string().trim().max(1000).optional().nullable(),
  rewardStatus: z.enum(["none", "pending", "delivered", "cancelled"]),
});

type RewardProfileRow = {
  id: string;
  customer_id: string;
  current_points: number;
  lifetime_points: number;
  level: string;
  public_nickname: string | null;
  show_in_rankings: boolean;
  created_at: string;
  updated_at: string;
};

type RewardLedgerRow = {
  id: string;
  customer_id: string;
  direction: "earn" | "spend" | "reverse" | "adjust";
  points: number;
  source_type: string;
  source_id: string | null;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type RankingRow = {
  id: string;
  year: number;
  month: number;
  title: string;
  status: string;
  first_place_reward: string | null;
  second_place_reward: string | null;
  third_place_reward: string | null;
  starts_at: string;
  ends_at: string;
};

type RankingEntryRow = {
  id: string;
  ranking_id: string;
  order_id: string;
  customer_id: string;
  order_number: string;
  order_total: number | string;
  paid_at: string;
  rank_position: number | null;
  is_winner: boolean;
  reward_status: string;
  reward_notes: string | null;
  customers?: {
    name?: string | null;
  } | null;
  reward_profiles?: {
    public_nickname?: string | null;
    show_in_rankings?: boolean | null;
  } | null;
};

type PaidOrderRow = {
  id: string;
  customer_id: string;
  order_number: string;
  total: number | string;
  payments?: Array<{
    amount: number | string;
    paid_at: string | null;
    status: string;
  }>;
};

type PaymentRow = {
  id: string;
  amount: number | string;
  customer_id: string | null;
  order_id: string;
  paid_at: string | null;
  status: string;
  orders?: {
    customer_id?: string | null;
    order_number?: string | null;
    total?: number | string | null;
  } | null;
};

function assertRewardsEnabled() {
  if (!isRewardsEnabled()) {
    throw forbidden("Clube Smart Funkos desativado");
  }
}

function pointsFromAmount(amount: number) {
  return Math.max(0, Math.floor(amount));
}

function getLevel(lifetimePoints: number) {
  return [...rewardLevels].reverse().find((level) => lifetimePoints >= level.minPoints) ?? rewardLevels[0];
}

function getNextLevel(lifetimePoints: number) {
  return rewardLevels.find((level) => level.minPoints > lifetimePoints) ?? null;
}

function monthBounds(year: number, month: number) {
  const startsAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endsAt = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { endsAt, startsAt };
}

function rankingTitle(year: number, month: number) {
  return `Ranking Mensal Top 3 Pedidos ${String(month).padStart(2, "0")}/${year}`;
}

function monthFromDate(value: string) {
  const date = new Date(value);
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function mapProfile(profile: RewardProfileRow) {
  const level = getLevel(profile.lifetime_points);
  const nextLevel = getNextLevel(profile.lifetime_points);
  const progressBase = level.minPoints;
  const progressTarget = nextLevel?.minPoints ?? level.minPoints;
  const progressPoints = Math.max(0, profile.lifetime_points - progressBase);
  const progressTotal = Math.max(1, progressTarget - progressBase);

  return {
    ...profile,
    currentLevel: level,
    nextLevel,
    progressPercent: nextLevel ? Math.min(100, Math.round((progressPoints / progressTotal) * 100)) : 100,
    pointsToNextLevel: nextLevel ? Math.max(0, nextLevel.minPoints - profile.lifetime_points) : 0,
  };
}

export class RewardsService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string | null,
  ) {}

  async getCustomerClub(customerId: string) {
    assertRewardsEnabled();
    const [profile, ledger, badges, ranking] = await Promise.all([
      this.ensureRewardProfile(customerId),
      this.listLedger(customerId, 30),
      this.listCustomerBadges(customerId),
      this.getCurrentRankingForCustomer(customerId),
    ]);

    return {
      badges,
      ledger,
      levels: rewardLevels,
      profile: mapProfile(profile),
      ranking,
    };
  }

  async getAdminDashboard(year = new Date().getUTCFullYear(), month = new Date().getUTCMonth() + 1) {
    assertRewardsEnabled();
    const [profiles, ranking] = await Promise.all([
      this.listRewardProfiles(),
      this.getRanking(year, month),
    ]);

    return {
      levels: rewardLevels,
      profiles: profiles.map(mapProfile),
      ranking,
    };
  }

  async listRewardProfiles() {
    const { data, error } = await this.supabase
      .from("reward_profiles")
      .select("*,customers(name,email,phone)")
      .order("lifetime_points", { ascending: false })
      .limit(300);

    if (error) {
      throwQueryError(error, "Falha ao listar perfis do clube");
    }

    return (data ?? []) as unknown as RewardProfileRow[];
  }

  async ensureRewardProfile(customerId: string) {
    const { data: existing, error: existingError } = await this.supabase
      .from("reward_profiles")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (existingError) {
      throwQueryError(existingError, "Falha ao buscar perfil do clube");
    }

    if (existing) {
      const profile = existing as RewardProfileRow;
      const level = getLevel(profile.lifetime_points);

      if (profile.level !== level.code) {
        const { data, error } = await this.supabase
          .from("reward_profiles")
          .update({ level: level.code })
          .eq("customer_id", customerId)
          .select("*")
          .single();

        if (error) {
          throwQueryError(error, "Falha ao atualizar nivel do clube");
        }

        return data as RewardProfileRow;
      }

      return profile;
    }

    const { data, error } = await this.supabase
      .from("reward_profiles")
      .insert({
        customer_id: customerId,
        level: rewardLevels[0].code,
      })
      .select("*")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar perfil do clube");
    }

    return data as RewardProfileRow;
  }

  async updateCustomerProfile(customerId: string, input: z.infer<typeof updateRewardProfileSchema>) {
    assertRewardsEnabled();
    await this.ensureRewardProfile(customerId);
    const patch = Object.fromEntries(
      Object.entries({
        public_nickname: input.publicNickname,
        show_in_rankings: input.showInRankings,
      }).filter(([, value]) => value !== undefined),
    );

    const { data, error } = await this.supabase
      .from("reward_profiles")
      .update(patch)
      .eq("customer_id", customerId)
      .select("*")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar perfil do clube");
    }

    return mapProfile(data as RewardProfileRow);
  }

  async awardPaymentPoints(paymentId: string) {
    if (!isRewardsEnabled()) {
      return null;
    }

    const payment = await this.getPayment(paymentId);

    if (payment.status !== "paid") {
      return null;
    }

    const customerId = payment.customer_id ?? payment.orders?.customer_id;

    if (!customerId) {
      return null;
    }

    const points = pointsFromAmount(Number(payment.amount));

    if (points <= 0) {
      return null;
    }

    const inserted = await this.addLedgerEntry({
      customerId,
      direction: "earn",
      metadata: {
        amount: Number(payment.amount),
        orderNumber: payment.orders?.order_number ?? null,
      },
      points,
      reason: "payment_paid",
      sourceId: payment.id,
      sourceType: "payment",
    });

    if (inserted) {
      await this.grantBadgeByCode(customerId, "first_paid_order", { paymentId: payment.id });
      const profile = await this.ensureRewardProfile(customerId);
      if (profile.lifetime_points >= 30000) {
        await this.grantBadgeByCode(customerId, "elite_collector", { lifetimePoints: profile.lifetime_points });
      }
    }

    if (payment.paid_at) {
      const { month, year } = monthFromDate(payment.paid_at);
      await this.refreshMonthlyRanking(year, month);
    }

    return { customerId, points };
  }

  async reversePaymentPoints(paymentId: string, refundedAmount?: number | null) {
    if (!isRewardsEnabled()) {
      return null;
    }

    const payment = await this.getPayment(paymentId);
    const customerId = payment.customer_id ?? payment.orders?.customer_id;

    if (!customerId) {
      return null;
    }

    const points = pointsFromAmount(Number(refundedAmount ?? payment.amount));

    if (points <= 0) {
      return null;
    }

    await this.addLedgerEntry({
      customerId,
      direction: "reverse",
      metadata: {
        amount: Number(refundedAmount ?? payment.amount),
        orderNumber: payment.orders?.order_number ?? null,
      },
      points,
      reason: "payment_refunded",
      sourceId: payment.id,
      sourceType: "payment",
    });

    if (payment.paid_at) {
      const { month, year } = monthFromDate(payment.paid_at);
      await this.refreshMonthlyRanking(year, month);
    }

    return { customerId, points };
  }

  async listLedger(customerId: string, limit = 100) {
    const { data, error } = await this.supabase
      .from("reward_point_ledger")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throwQueryError(error, "Falha ao listar extrato de pontos");
    }

    return (data ?? []) as RewardLedgerRow[];
  }

  async listCustomerBadges(customerId: string) {
    const { data, error } = await this.supabase
      .from("reward_profile_badges")
      .select("id,granted_at,metadata,reward_badges(code,name,description,icon)")
      .eq("customer_id", customerId)
      .order("granted_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar badges do cliente");
    }

    return data ?? [];
  }

  async getRanking(year: number, month: number) {
    assertRewardsEnabled();
    const ranking = await this.ensureMonthlyRanking(year, month);
    await this.refreshMonthlyRanking(year, month);
    return this.getRankingById(ranking.id);
  }

  async getCurrentRankingForCustomer(customerId: string) {
    const now = new Date();
    const ranking = await this.getRanking(now.getUTCFullYear(), now.getUTCMonth() + 1);
    const myEntries = ranking.entries.filter((entry) => entry.customer_id === customerId);

    return {
      ...ranking,
      myEntries,
    };
  }

  async updateRanking(year: number, month: number, input: z.infer<typeof updateRankingSchema>) {
    assertRewardsEnabled();
    const ranking = await this.ensureMonthlyRanking(year, month);
    const now = new Date().toISOString();
    const patch = {
      awarded_at: input.status === "awarded" ? now : undefined,
      closed_at: input.status === "closed" ? now : undefined,
      first_place_reward: input.firstPlaceReward,
      second_place_reward: input.secondPlaceReward,
      status: input.status,
      third_place_reward: input.thirdPlaceReward,
    };
    const { data, error } = await this.supabase
      .from("monthly_order_rankings")
      .update(Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)))
      .eq("id", ranking.id)
      .select("*")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar ranking mensal");
    }

    return data;
  }

  async updateRankingEntry(entryId: string, input: z.infer<typeof updateRankingEntrySchema>) {
    assertRewardsEnabled();
    const { data, error } = await this.supabase
      .from("monthly_order_ranking_entries")
      .update({
        reward_notes: input.rewardNotes,
        reward_status: input.rewardStatus,
      })
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar brinde do ranking");
    }

    return data;
  }

  async refreshMonthlyRanking(year: number, month: number) {
    const ranking = await this.ensureMonthlyRanking(year, month);
    const { startsAt, endsAt } = monthBounds(year, month);
    const paidOrders = await this.listPaidOrdersInPeriod(startsAt.toISOString(), endsAt.toISOString());
    const paidOrderIds = new Set(paidOrders.map((order) => order.id));

    const { data: existingEntries, error: existingError } = await this.supabase
      .from("monthly_order_ranking_entries")
      .select("id,order_id")
      .eq("ranking_id", ranking.id);

    if (existingError) {
      throwQueryError(existingError, "Falha ao listar entradas atuais do ranking");
    }

    const staleIds = (existingEntries ?? [])
      .filter((entry) => !paidOrderIds.has(entry.order_id))
      .map((entry) => entry.id);

    if (staleIds.length > 0) {
      const { error } = await this.supabase
        .from("monthly_order_ranking_entries")
        .delete()
        .in("id", staleIds);

      if (error) {
        throwQueryError(error, "Falha ao remover entradas antigas do ranking");
      }
    }

    if (paidOrders.length > 0) {
      const rows = paidOrders.map((order) => ({
        customer_id: order.customer_id,
        is_winner: false,
        order_id: order.id,
        order_number: order.order_number,
        order_total: Number(order.total),
        paid_at: this.getOrderPaidAt(order),
        ranking_id: ranking.id,
        reward_status: "none",
      }));
      const { error } = await this.supabase
        .from("monthly_order_ranking_entries")
        .upsert(rows, { onConflict: "ranking_id,order_id" });

      if (error) {
        throwQueryError(error, "Falha ao atualizar entradas do ranking");
      }
    }

    await this.repositionRanking(ranking.id);
    return this.getRankingById(ranking.id);
  }

  private async addLedgerEntry(input: {
    customerId: string;
    direction: "earn" | "spend" | "reverse" | "adjust";
    metadata?: Record<string, unknown>;
    points: number;
    reason: string;
    sourceId?: string | null;
    sourceType: string;
  }) {
    await this.ensureRewardProfile(input.customerId);

    const { error } = await this.supabase
      .from("reward_point_ledger")
      .insert({
        created_by: this.actorId ?? null,
        customer_id: input.customerId,
        direction: input.direction,
        metadata: input.metadata ?? null,
        points: input.points,
        reason: input.reason,
        source_id: input.sourceId ?? null,
        source_type: input.sourceType,
      });

    if (error?.code === "23505") {
      return null;
    }

    if (error) {
      throwQueryError(error, "Falha ao registrar pontos");
    }

    const profile = await this.ensureRewardProfile(input.customerId);
    const currentDelta = input.direction === "earn" || input.direction === "adjust" ? input.points : -input.points;
    const lifetimeDelta = input.direction === "earn" ? input.points : 0;
    const currentPoints = Math.max(0, Number(profile.current_points) + currentDelta);
    const lifetimePoints = Number(profile.lifetime_points) + lifetimeDelta;
    const level = getLevel(lifetimePoints);

    const { error: profileError } = await this.supabase
      .from("reward_profiles")
      .update({
        current_points: currentPoints,
        level: level.code,
        lifetime_points: lifetimePoints,
      })
      .eq("customer_id", input.customerId);

    if (profileError) {
      throwQueryError(profileError, "Falha ao atualizar saldo de pontos");
    }

    return true;
  }

  private async getPayment(paymentId: string) {
    const { data, error } = await this.supabase
      .from("payments")
      .select("id,order_id,customer_id,amount,status,paid_at,orders(customer_id,order_number,total)")
      .eq("id", paymentId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pagamento para rewards");
    }

    if (!data) {
      throw notFound("Pagamento nao encontrado");
    }

    return data as unknown as PaymentRow;
  }

  private async ensureMonthlyRanking(year: number, month: number): Promise<RankingRow> {
    const { data: existing, error: existingError } = await this.supabase
      .from("monthly_order_rankings")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (existingError) {
      throwQueryError(existingError, "Falha ao buscar ranking mensal");
    }

    if (existing) {
      return existing as RankingRow;
    }

    const { startsAt, endsAt } = monthBounds(year, month);
    const { data, error } = await this.supabase
      .from("monthly_order_rankings")
      .insert({
        ends_at: endsAt.toISOString(),
        month,
        starts_at: startsAt.toISOString(),
        title: rankingTitle(year, month),
        year,
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      return await this.ensureMonthlyRanking(year, month);
    }

    if (error) {
      throwQueryError(error, "Falha ao criar ranking mensal");
    }

    return data as RankingRow;
  }

  private async getRankingById(rankingId: string) {
    const { data: ranking, error: rankingError } = await this.supabase
      .from("monthly_order_rankings")
      .select("*")
      .eq("id", rankingId)
      .single();

    if (rankingError) {
      throwQueryError(rankingError, "Falha ao buscar ranking mensal");
    }

    const { data: entries, error: entriesError } = await this.supabase
      .from("monthly_order_ranking_entries")
      .select("*,customers(name)")
      .eq("ranking_id", rankingId)
      .order("rank_position", { ascending: true, nullsFirst: false })
      .order("order_total", { ascending: false });

    if (entriesError) {
      throwQueryError(entriesError, "Falha ao listar entradas do ranking");
    }

    const rankingEntries = (entries ?? []) as unknown as RankingEntryRow[];
    const customerIds = Array.from(new Set(rankingEntries.map((entry) => entry.customer_id)));
    const profileByCustomerId = new Map<string, { public_nickname?: string | null; show_in_rankings?: boolean | null }>();

    if (customerIds.length > 0) {
      const { data: profiles, error: profilesError } = await this.supabase
        .from("reward_profiles")
        .select("customer_id,public_nickname,show_in_rankings")
        .in("customer_id", customerIds);

      if (profilesError) {
        throwQueryError(profilesError, "Falha ao listar perfis do ranking");
      }

      for (const profile of profiles ?? []) {
        profileByCustomerId.set(profile.customer_id, profile);
      }
    }

    return {
      ...(ranking as RankingRow),
      entries: rankingEntries.map((entry) => {
        const profile = profileByCustomerId.get(entry.customer_id);

        return {
          ...entry,
          displayName:
          profile?.show_in_rankings === false
            ? "Cliente privado"
            : profile?.public_nickname || entry.customers?.name || "Cliente Smart",
        };
      }),
    };
  }

  private async listPaidOrdersInPeriod(startIso: string, endIso: string) {
    const { data: payments, error: paymentsError } = await this.supabase
      .from("payments")
      .select("order_id")
      .eq("status", "paid")
      .gte("paid_at", startIso)
      .lt("paid_at", endIso);

    if (paymentsError) {
      throwQueryError(paymentsError, "Falha ao buscar pagamentos do periodo");
    }

    const orderIds = Array.from(new Set((payments ?? []).map((payment) => payment.order_id).filter(Boolean)));

    if (orderIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("orders")
      .select("id,customer_id,order_number,total,payments(amount,status,paid_at)")
      .in("id", orderIds)
      .not("status", "in", "(cancelled,refunded)");

    if (error) {
      throwQueryError(error, "Falha ao buscar pedidos pagos do ranking");
    }

    return ((data ?? []) as unknown as PaidOrderRow[]).filter((order) => {
      const paidAmount = (order.payments ?? [])
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      return paidAmount + 0.001 >= Number(order.total);
    });
  }

  private getOrderPaidAt(order: PaidOrderRow) {
    const paidDates = (order.payments ?? [])
      .filter((payment) => payment.status === "paid" && payment.paid_at)
      .map((payment) => String(payment.paid_at))
      .sort();

    return paidDates.at(-1) ?? new Date().toISOString();
  }

  private async repositionRanking(rankingId: string) {
    const { data, error } = await this.supabase
      .from("monthly_order_ranking_entries")
      .select("id,customer_id,order_total,paid_at")
      .eq("ranking_id", rankingId)
      .order("order_total", { ascending: false })
      .order("paid_at", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao ordenar ranking mensal");
    }

    await Promise.all((data ?? []).map((entry, index) => {
      const rankPosition = index + 1;
      const isWinner = rankPosition <= 3;
      return this.supabase
        .from("monthly_order_ranking_entries")
        .update({
          is_winner: isWinner,
          rank_position: rankPosition,
          reward_status: isWinner ? "pending" : "none",
        })
        .eq("id", entry.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            throwQueryError(updateError, "Falha ao atualizar posicao do ranking");
          }
        });
    }));

    await Promise.all((data ?? []).slice(0, 3).map((entry) =>
      this.grantBadgeByCode(entry.customer_id, "top3_monthly_order", { rankingId }),
    ));
  }

  private async grantBadgeByCode(customerId: string, code: string, metadata?: Record<string, unknown>) {
    const { data: badge, error: badgeError } = await this.supabase
      .from("reward_badges")
      .select("id")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (badgeError) {
      throwQueryError(badgeError, "Falha ao buscar badge");
    }

    if (!badge) {
      return null;
    }

    const { error } = await this.supabase
      .from("reward_profile_badges")
      .insert({
        badge_id: badge.id,
        customer_id: customerId,
        granted_by: this.actorId ?? null,
        metadata: metadata ?? null,
      });

    if (error?.code === "23505") {
      return null;
    }

    if (error) {
      throwQueryError(error, "Falha ao conceder badge");
    }

    return true;
  }
}
