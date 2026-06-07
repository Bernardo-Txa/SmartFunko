import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const wishlistCreateSchema = z.object({
  productId: z.string().uuid(),
  desiredPrice: z.number().nonnegative().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().trim().optional().nullable(),
});

type DemandWishlistRow = {
  created_at: string;
  desired_price: number | string | null;
  id: string;
  priority: "low" | "medium" | "high";
  customers?: {
    email: string | null;
    id: string;
    name: string;
    phone: string | null;
  } | null;
  products?: {
    category_name: string | null;
    funko_number: string | null;
    id: string;
    main_image_url: string | null;
    name: string;
    slug: string;
    franchises?: { name: string; slug: string } | { name: string; slug: string }[] | null;
    suppliers?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  } | null;
};

export type WishlistDemandProduct = {
  category: string;
  customers: Array<{
    email: string | null;
    id: string;
    name: string;
    phone: string | null;
    priority: "low" | "medium" | "high";
  }>;
  desiredPriceAverage: number | null;
  franchise: string;
  imageUrl: string | null;
  lastInterestAt: string;
  priorityAverage: number | null;
  productId: string;
  productName: string;
  productSlug: string;
  supplier: string;
  total: number;
};

export type WishlistDemandRanking = {
  label: string;
  total: number;
};

export type WishlistDemandDashboard = {
  categories: WishlistDemandRanking[];
  franchises: WishlistDemandRanking[];
  products: WishlistDemandProduct[];
  suppliers: WishlistDemandRanking[];
  totalCustomers: number;
  totalItems: number;
};

const priorityScore: Record<"low" | "medium" | "high", number> = {
  high: 3,
  low: 1,
  medium: 2,
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function incrementRanking(map: Map<string, number>, label: string) {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function toRanking(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((first, second) => second.total - first.total || first.label.localeCompare(second.label, "pt-BR"));
}

export class WishlistService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async listWishlist(customerId: string) {
    const { data, error } = await this.supabase
      .from("wishlist_items")
      .select("id,customer_id,product_id,desired_price,priority,notes,created_at,products(id,name,slug,main_image_url)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar wishlist");
    }

    return data ?? [];
  }

  async addWishlistItem(customerId: string, input: z.infer<typeof wishlistCreateSchema>) {
    const { data, error } = await this.supabase
      .from("wishlist_items")
      .upsert(
        {
          customer_id: customerId,
          desired_price: input.desiredPrice ?? null,
          notes: input.notes ?? null,
          priority: input.priority,
          product_id: input.productId,
        },
        { onConflict: "customer_id,product_id" },
      )
      .select("id,customer_id,product_id,desired_price,priority,notes,created_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao salvar wishlist");
    }

    return data;
  }

  async deleteWishlistItem(customerId: string, id: string) {
    const { error } = await this.supabase
      .from("wishlist_items")
      .delete()
      .eq("id", id)
      .eq("customer_id", customerId);

    if (error) {
      throwQueryError(error, "Falha ao remover wishlist");
    }
  }

  async getDemandDashboard(): Promise<WishlistDemandDashboard> {
    const { data, error } = await this.supabase
      .from("wishlist_items")
      .select(
        `
          id,desired_price,priority,created_at,
          customers(id,name,email,phone),
          products(
            id,name,slug,funko_number,category_name,main_image_url,
            franchises(name,slug),
            suppliers(name,slug)
          )
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao carregar demanda da wishlist");
    }

    const rows = (data ?? []) as unknown as DemandWishlistRow[];
    const products = new Map<
      string,
      WishlistDemandProduct & {
        desiredPriceSum: number;
        desiredPriceTotal: number;
        prioritySum: number;
      }
    >();
    const customerIds = new Set<string>();
    const franchises = new Map<string, number>();
    const suppliers = new Map<string, number>();
    const categories = new Map<string, number>();

    for (const row of rows) {
      const product = row.products;

      if (!product) {
        continue;
      }

      const customer = row.customers;
      const franchise = firstRelation(product.franchises)?.name ?? "Sem franquia";
      const supplier = firstRelation(product.suppliers)?.name ?? "Sem fornecedor";
      const category = product.category_name ?? "Sem categoria";
      const current =
        products.get(product.id) ??
        {
          category,
          customers: [],
          desiredPriceAverage: null,
          desiredPriceSum: 0,
          desiredPriceTotal: 0,
          franchise,
          imageUrl: product.main_image_url,
          lastInterestAt: row.created_at,
          priorityAverage: null,
          prioritySum: 0,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          supplier,
          total: 0,
        };

      current.total += 1;
      current.prioritySum += priorityScore[row.priority];

      if (new Date(row.created_at).getTime() > new Date(current.lastInterestAt).getTime()) {
        current.lastInterestAt = row.created_at;
      }

      if (row.desired_price !== null) {
        current.desiredPriceSum += Number(row.desired_price);
        current.desiredPriceTotal += 1;
      }

      if (customer) {
        customerIds.add(customer.id);
        current.customers.push({
          email: customer.email,
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          priority: row.priority,
        });
      }

      products.set(product.id, current);
      incrementRanking(franchises, franchise);
      incrementRanking(suppliers, supplier);
      incrementRanking(categories, category);
    }

    const productRows = Array.from(products.values())
      .map((product) => {
        const {
          desiredPriceSum,
          desiredPriceTotal,
          prioritySum,
          ...publicProduct
        } = product;

        return {
          ...publicProduct,
          desiredPriceAverage:
            desiredPriceTotal > 0 ? desiredPriceSum / desiredPriceTotal : null,
          priorityAverage: product.total > 0 ? prioritySum / product.total : null,
        };
      })
      .sort((first, second) => second.total - first.total || first.productName.localeCompare(second.productName, "pt-BR"));

    return {
      categories: toRanking(categories),
      franchises: toRanking(franchises),
      products: productRows,
      suppliers: toRanking(suppliers),
      totalCustomers: customerIds.size,
      totalItems: rows.length,
    };
  }
}
