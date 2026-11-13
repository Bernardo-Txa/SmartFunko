-- Purpose:
--   Allow the authenticated preorder reservation policies to resolve ownership
--   through public.customers on Supabase branches where default SELECT grants
--   are intentionally absent. Customers RLS still limits the lookup to the
--   caller's own row (or an owner/admin row).
--
-- Rollback:
--   REVOKE SELECT (id, profile_id) ON public.customers FROM authenticated;
--   Roll back only together with replacement preorder ownership policies,
--   otherwise customers lose access to their own reservations.

grant select (id, profile_id)
on table public.customers
to authenticated;

-- Read-only validation:
--   information_schema.role_column_grants must show only id/profile_id for this
--   grant, and client A/B reservation tests must remain mutually isolated.
