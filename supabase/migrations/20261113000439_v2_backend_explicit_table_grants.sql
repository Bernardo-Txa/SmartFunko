-- Purpose:
--   Preserve legitimate backend V2 order operations after
--   v2_recalculate_order_totals(uuid) becomes SECURITY INVOKER. Supabase
--   branches omit default public-schema DML grants, so service_role must receive
--   explicit access to both the trigger source and recalculated parent table.
--
-- Rollback:
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.v2_order_items FROM service_role;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.v2_orders FROM service_role;
--   Roll back only after replacing backend access and recalc execution paths.

grant select, insert, update, delete
on table public.v2_order_items
to service_role;

grant select, insert, update, delete
on table public.v2_orders
to service_role;

-- No grants are added for anon or authenticated. Their existing RLS and table
-- privileges continue to determine whether any direct operation is possible.
