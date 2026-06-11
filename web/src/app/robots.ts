import type { MetadataRoute } from "next";
import { isRafflesEnabled } from "@/lib/env";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/admin",
    "/admin/",
    "/conta",
    "/conta/",
    "/api",
    "/api/",
    "/pedido/",
    "/*?token=*",
    "/*&token=*",
  ];

  if (!isRafflesEnabled()) {
    disallow.push("/rifas", "/rifas/");
  }

  return {
    rules: {
      allow: ["/", "/catalogo", "/produto/", "/fornecedores/", ...(isRafflesEnabled() ? ["/rifas/"] : [])],
      disallow,
      userAgent: "*",
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
