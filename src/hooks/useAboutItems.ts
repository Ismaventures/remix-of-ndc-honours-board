import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type AboutItemRow = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  display_order: number;
  is_published: boolean;
};

export function useAboutItems() {
  const [rows, setRows] = useState<AboutItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("museum_about_items")
        .select("*")
        .order("display_order");
      if (!error && data) setRows(data as AboutItemRow[]);
    } catch {
      /* keep fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const upsert = async (row: Omit<AboutItemRow, "id"> & { id?: string }) => {
    const payload = {
      ...row,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("museum_about_items")
      .upsert(payload, { onConflict: "id" });
    if (!error) await load();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("museum_about_items").delete().eq("id", id);
    if (!error) await load();
    return !error;
  };

  return { items: rows, loading, reload: load, upsert, remove };
}
