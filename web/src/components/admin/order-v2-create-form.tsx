"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2, UserPlus } from "lucide-react";
import {
  ProductVariantSearchSelect,
  type ProductVariantSearchOption,
} from "@/components/admin/product-variant-search-select";
import { formatCurrency, formatPhoneNumber } from "@/lib/format";
import { orderSellerOptions } from "@/lib/order-labels";

type CustomerOption = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

type TemporaryCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};

type OrderDraftItem = {
  id: string;
  productName: string;
  productSku: string;
  productVariant: ProductVariantSearchOption | null;
  quantity: string;
  unitPrice: string;
};

type ApiResponse = {
  data?: Array<{ id: string }>;
  error?: {
    message?: string;
  };
};

type TemporaryCustomerApiResponse = {
  data?: TemporaryCustomerOption;
  error?: {
    message?: string;
  };
};

type CustomerSelectionKind = "customer" | "temporary";

function getSelectionKey(kind: CustomerSelectionKind, id: string) {
  return `${kind}:${id}`;
}

function parseSelectionKey(value: string) {
  const [kind, id] = value.split(":");

  if ((kind === "customer" || kind === "temporary") && id) {
    return { id, kind };
  }

  return null;
}

function createDraftItem(): OrderDraftItem {
  return {
    id: crypto.randomUUID(),
    productName: "",
    productSku: "",
    productVariant: null,
    quantity: "1",
    unitPrice: "",
  };
}

function parseMoney(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCustomerPhone(phone: string | null) {
  return formatPhoneNumber(phone) || phone || "";
}

export function OrderV2CreateForm({
  customers,
  defaultOrderDate,
  supplierId,
  temporaryCustomers,
}: {
  customers: CustomerOption[];
  defaultOrderDate: string;
  supplierId?: string | null;
  temporaryCustomers: TemporaryCustomerOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isCreatingTemporaryCustomer, setIsCreatingTemporaryCustomer] = useState(false);
  const [isTemporaryFormOpen, setIsTemporaryFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<OrderDraftItem[]>([createDraftItem()]);
  const [localTemporaryCustomers, setLocalTemporaryCustomers] = useState(temporaryCustomers);
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(defaultOrderDate);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(
    customers[0]?.id
      ? getSelectionKey("customer", customers[0].id)
      : temporaryCustomers[0]?.id
        ? getSelectionKey("temporary", temporaryCustomers[0].id)
        : "",
  );
  const [seller, setSeller] = useState("daniel");
  const [temporaryCustomerName, setTemporaryCustomerName] = useState("");
  const [temporaryCustomerNotes, setTemporaryCustomerNotes] = useState("");
  const [temporaryCustomerPhone, setTemporaryCustomerPhone] = useState("");
  const total = useMemo(
    () => items.reduce((sum, item) => sum + parseMoney(item.unitPrice) * Number(item.quantity || 1), 0),
    [items],
  );

  function updateItem(id: string, patch: Partial<OrderDraftItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function selectVariant(id: string, option: ProductVariantSearchOption | null) {
    updateItem(id, {
      productName: option?.productName ?? "",
      productSku: option?.sku ?? "",
      productVariant: option,
      unitPrice: option ? String(option.salePrice) : "",
    });
  }

  async function submit() {
    setError("");
    setIsSubmitting(true);

    try {
      const selectedCustomer = parseSelectionKey(selectedCustomerKey);

      if (!selectedCustomer) {
        throw new Error("Selecione um cliente cadastrado ou temporario");
      }

      const payload = {
        customerId: selectedCustomer.kind === "customer" ? selectedCustomer.id : null,
        internalNotes: internalNotes || null,
        notes: notes || null,
        orderDate,
        seller,
        temporaryCustomerId: selectedCustomer.kind === "temporary" ? selectedCustomer.id : null,
        items: items.map((item) => ({
          productName: item.productName,
          productSku: item.productSku || null,
          productVariantId: item.productVariant?.id ?? null,
          quantity: Number(item.quantity || 1),
          unitPrice: parseMoney(item.unitPrice),
        })),
      };
      const response = await fetch("/api/v1/admin/orders-v2", {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao lancar pedidos");
      }

      setItems([createDraftItem()]);
      setNotes("");
      setInternalNotes("");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao lancar pedidos");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createTemporaryCustomer() {
    setError("");
    setIsCreatingTemporaryCustomer(true);

    try {
      const response = await fetch("/api/v1/admin/temporary-customers", {
        body: JSON.stringify({
          name: temporaryCustomerName,
          notes: temporaryCustomerNotes || null,
          phone: temporaryCustomerPhone,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as TemporaryCustomerApiResponse;

      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Falha ao criar cliente temporario");
      }

      const createdCustomer = body.data;

      setLocalTemporaryCustomers((current) => {
        if (current.some((customer) => customer.id === createdCustomer.id)) {
          return current;
        }

        return [createdCustomer, ...current];
      });
      setSelectedCustomerKey(getSelectionKey("temporary", createdCustomer.id));
      setTemporaryCustomerName("");
      setTemporaryCustomerPhone("");
      setTemporaryCustomerNotes("");
      setIsTemporaryFormOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao criar cliente temporario");
    } finally {
      setIsCreatingTemporaryCustomer(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Lancar pedidos WhatsApp</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Total do lancamento: <strong className="text-[var(--foreground)]">{formatCurrency(total)}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setItems((current) => [...current, createDraftItem()])}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
        >
          <Plus size={16} aria-hidden="true" />
          Item
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(150px,180px)_minmax(150px,180px)]">
        <label className="block min-w-0">
          <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--foreground)]">
            Cliente
            <button
              type="button"
              onClick={() => setIsTemporaryFormOpen((current) => !current)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] px-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <UserPlus size={14} aria-hidden="true" />
              Temporario
            </button>
          </span>
          <select
            value={selectedCustomerKey}
            onChange={(event) => setSelectedCustomerKey(event.target.value)}
            className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="">Selecione</option>
            <optgroup label="Clientes cadastrados">
              {customers.map((customer) => (
                <option key={customer.id} value={getSelectionKey("customer", customer.id)}>
                  {customer.name} {customer.phone ? `- ${formatCustomerPhone(customer.phone)}` : ""}
                </option>
              ))}
            </optgroup>
            {localTemporaryCustomers.length > 0 ? (
              <optgroup label="Clientes temporarios">
                {localTemporaryCustomers.map((customer) => (
                  <option key={customer.id} value={getSelectionKey("temporary", customer.id)}>
                    {customer.name} {customer.phone ? `- ${formatCustomerPhone(customer.phone)}` : ""} (temporario)
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="text-sm font-semibold text-[var(--foreground)]">Vendedor</span>
          <select
            value={seller}
            onChange={(event) => setSeller(event.target.value)}
            className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {orderSellerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="text-sm font-semibold text-[var(--foreground)]">Data do pedido</span>
          <input
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
            type="date"
            className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {isTemporaryFormOpen ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(150px,220px)_auto] md:items-end">
            <label className="block min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)]">Nome temporario</span>
              <input
                value={temporaryCustomerName}
                onChange={(event) => setTemporaryCustomerName(event.target.value)}
                className="mt-2 h-10 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Nome do cliente no WhatsApp"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)]">WhatsApp</span>
              <input
                value={temporaryCustomerPhone}
                onChange={(event) => setTemporaryCustomerPhone(formatPhoneNumber(event.target.value))}
                inputMode="tel"
                maxLength={15}
                className="mt-2 h-10 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="(00) 00000-0000"
              />
            </label>
            <button
              type="button"
              disabled={isCreatingTemporaryCustomer}
              onClick={() => void createTemporaryCustomer()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--accent)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={15} aria-hidden="true" />
              Criar e selecionar
            </button>
          </div>
          <label className="mt-3 block min-w-0">
            <span className="text-sm font-semibold text-[var(--foreground)]">Observacao do temporario</span>
            <input
              value={temporaryCustomerNotes}
              onChange={(event) => setTemporaryCustomerNotes(event.target.value)}
              className="mt-2 h-10 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Opcional"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid min-w-0 gap-3 rounded-lg border border-[var(--border)] p-3 xl:grid-cols-[minmax(0,1fr)_90px_130px_44px]">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.5fr)]">
              <ProductVariantSearchSelect
                label={`Produto ${index + 1}`}
                selected={item.productVariant}
                onSelect={(option) => selectVariant(item.id, option)}
                placeholder="Buscar produto ja cadastrado"
                supplierId={supplierId}
              />
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-[var(--foreground)]">Nome livre do pedido</span>
                <input
                  value={item.productName}
                  onChange={(event) => updateItem(item.id, { productName: event.target.value })}
                  className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="Nao cadastra no catalogo"
                />
              </label>
            </div>
            <label className="block min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)]">Qtd.</span>
              <input
                value={item.quantity}
                min={1}
                onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                type="number"
                className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
              <input
                value={item.unitPrice}
                onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })}
                inputMode="decimal"
                className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <button
              type="button"
              onClick={() => setItems((current) => current.length === 1 ? current : current.filter((draft) => draft.id !== item.id))}
              className="mt-7 inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-red-400/10 hover:text-red-200"
              aria-label="Remover item"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Observacao para cliente</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Nota interna</span>
          <textarea
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-red-300">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting || !selectedCustomerKey}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-5 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        Lancar pedidos
      </button>
    </section>
  );
}
