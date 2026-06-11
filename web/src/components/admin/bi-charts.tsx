"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  BiCashflowBucket,
  BiOriginRow,
  BiPaymentMethodRow,
  BiPeriodBucket,
  BiRaffleRevenueRow,
  BiSellerRow,
  BiTopProductRow,
} from "@/server/bi/bi-service";

const chartColors = ["#22c55e", "#38bdf8", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6", "#f97316"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function truncate(value: string, max = 36) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
      {label}
    </div>
  );
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};

export function RevenueChart({ data }: { data: BiPeriodBucket[] }) {
  return (
    <ChartCard title="Receita por periodo" description="Receita confirmada por caixa de venda.">
      {data.length === 0 ? (
        <EmptyChart label="Sem receita confirmada no periodo." />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatCurrency} tickLine={false} width={76} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Area dataKey="amount" name="Receita" stroke="#22c55e" fill="#22c55e" fillOpacity={0.18} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function SalesBySellerChart({ data }: { data: BiSellerRow[] }) {
  return (
    <ChartCard title="Vendas por vendedor" description="Receita e pedidos pagos por vendedor.">
      {data.length === 0 ? (
        <EmptyChart label="Sem vendas por vendedor." />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="seller" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatCurrency} tickLine={false} width={76} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Bar dataKey="amount" name="Receita" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function SalesByOriginChart({ data }: { data: BiOriginRow[] }) {
  return (
    <ChartCard title="Vendas por origem" description="Receita por origem dos itens vendidos.">
      {data.length === 0 ? (
        <EmptyChart label="Sem vendas por origem." />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="origin" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatCurrency} tickLine={false} width={76} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Bar dataKey="amount" name="Receita" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function PaymentMethodChart({ data }: { data: BiPaymentMethodRow[] }) {
  return (
    <ChartCard title="Metodos de pagamento" description="Distribuicao da receita confirmada por metodo.">
      {data.length === 0 ? (
        <EmptyChart label="Sem pagamentos confirmados." />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="method" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={entry.method} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function TopProductsChart({ data }: { data: BiTopProductRow[] }) {
  const chartData = data.slice(0, 10).map((item) => ({
    ...item,
    label: truncate(item.sku ? `${item.productName} (${item.sku})` : item.productName),
  }));

  return (
    <ChartCard title="Top produtos" description="Top 10 produtos por receita confirmada.">
      {chartData.length === 0 ? (
        <EmptyChart label="Sem produtos vendidos." />
      ) : (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ bottom: 8, left: 12, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatCurrency} tickLine={false} />
              <YAxis dataKey="label" type="category" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} width={132} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Bar dataKey="amount" name="Receita" fill="#a78bfa" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function RaffleRevenueChart({ data }: { data: BiRaffleRevenueRow[] }) {
  return (
    <ChartCard title="Receita de rifas" description="Receita paga e reservas pendentes por campanha.">
      {data.length === 0 ? (
        <EmptyChart label="Sem receita de rifa no periodo." />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 10).map((item) => ({
                ...item,
                campaignTitle: truncate(item.campaignTitle, 28),
              }))}
              margin={{ bottom: 8, left: 0, right: 8, top: 8 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="campaignTitle" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatCurrency} tickLine={false} width={76} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />
              <Bar dataKey="paidAmount" name="Pago" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pendingAmount" name="Pendente" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function CashflowChart({ data }: { data: BiCashflowBucket[] }) {
  return (
    <ChartCard title="Caixa" description="Entradas, saidas e saldo liquido por periodo.">
      {data.length === 0 ? (
        <EmptyChart label="Sem lancamentos de caixa no periodo." />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatCurrency} tickLine={false} width={76} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />
              <Line dataKey="income" name="Entradas" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line dataKey="expense" name="Saidas" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line dataKey="net" name="Liquido" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
