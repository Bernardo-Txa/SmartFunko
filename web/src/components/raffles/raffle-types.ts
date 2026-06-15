export type RaffleStats = {
  available: number;
  pending: number;
  revenue: number;
  sold: number;
  soldPercent: number;
  total: number;
};

export type RaffleCampaign = {
  code: string;
  created_at?: string;
  description: string | null;
  draw_at: string | null;
  draw_method: string | null;
  draw_notes?: string | null;
  draw_reference: string | null;
  drawn_at?: string | null;
  ends_at: string | null;
  id: string;
  legal_authorization_code: string | null;
  legal_authorization_url: string | null;
  max_numbers_per_customer: number | null;
  number_end: number;
  number_start: number;
  price_per_number: number | string;
  prize_description: string | null;
  prize_image_url: string | null;
  prize_title: string;
  requires_authorization: boolean;
  reservation_minutes: number;
  rules: string | null;
  slug: string;
  starts_at: string | null;
  stats?: RaffleStats;
  status: string;
  terms_accepted_by_admin: boolean;
  title: string;
  total_numbers: number;
  winner_customer_id?: string | null;
  winner_raffle_number_id?: string | null;
};

export type RaffleNumber = {
  id: string;
  label: string;
  number: number;
  reserved_until?: string | null;
  sold_at?: string | null;
  status: string;
};

export type RaffleOrder = {
  cancelled_at: string | null;
  capture_method?: string | null;
  cash_entry_id: string | null;
  created_at: string;
  customer_id: string;
  expired_at: string | null;
  id: string;
  notes: string | null;
  order_number: string;
  paid_at: string | null;
  paid_amount?: number | string | null;
  payment_id?: string | null;
  payment_fee_mode?: string | null;
  payment_link_created_at?: string | null;
  payment_link_expires_at?: string | null;
  payment_link_url?: string | null;
  payment_max_installments?: number | null;
  payment_max_installments_source?: string | null;
  payment_provider?: string | null;
  payment_provider_reference?: string | null;
  payment_status?: string | null;
  quantity: number;
  raffle_campaign_id: string;
  receipt_url?: string | null;
  reserved_until: string | null;
  status: string;
  total_amount: number | string;
  transaction_nsu?: string | null;
  unit_price: number | string;
  provider_payload?: unknown;
  customers?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  raffle_campaigns?: {
    code?: string | null;
    draw_at?: string | null;
    id?: string | null;
    prize_title?: string | null;
    slug?: string | null;
    status?: string | null;
    title?: string | null;
  } | null;
  raffle_numbers?: RaffleNumber[];
};
