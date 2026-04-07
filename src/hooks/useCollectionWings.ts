import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type CollectionWingRow = {
  id: string;
  title: string;
  category: string;
  summary: string;
  curatorial_note: string;
  highlights: string[];
  featured_fact: string;
  display_order: number;
  is_published: boolean;
};

export function useCollectionWings() {
  const [rows, setRows] = useState<CollectionWingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("museum_collection_wings")
        .select("*")
        .order("display_order");
      if (!error && data) setRows(data as CollectionWingRow[]);
    } catch {
      /* keep fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const upsert = async (row: CollectionWingRow) => {
    const { error } = await supabase
      .from("museum_collection_wings")
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (!error) await load();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("museum_collection_wings").delete().eq("id", id);
    if (!error) await load();
    return !error;
  };

  return { wings: rows, loading, reload: load, upsert, remove };
}
