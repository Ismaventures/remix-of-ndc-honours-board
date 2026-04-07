import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type TourRouteRow = {
  id: string;
  title: string;
  duration: string;
  audience: string;
  description: string;
  stops: string[];
  service_color: string;
  collection_id: string | null;
  display_order: number;
  is_published: boolean;
};

export function useTourRoutes() {
  const [rows, setRows] = useState<TourRouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("museum_tour_routes")
        .select("*")
        .order("display_order");
      if (!error && data) setRows(data as TourRouteRow[]);
    } catch {
      /* keep fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const upsert = async (row: Omit<TourRouteRow, "id"> & { id?: string }) => {
    const payload = {
      ...row,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("museum_tour_routes")
      .upsert(payload, { onConflict: "id" });
    if (!error) await load();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("museum_tour_routes").delete().eq("id", id);
    if (!error) await load();
    return !error;
  };

  return { routes: rows, loading, reload: load, upsert, remove };
}
