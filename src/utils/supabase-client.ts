import { useSupabaseClient as _useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "~/lib/database.types";

export function useSupabaseClient() {
  return _useSupabaseClient<Database>();
}

export type Profile = Database["public"]["Tables"]["profile"]["Row"];
