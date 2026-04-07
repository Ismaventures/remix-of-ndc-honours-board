import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type MuseumSectionRow = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon_name: string;
  accent: string;
  service_color: string;
  display_order: number;
  is_published: boolean;
};

export function useMuseumSections() {
  const [rows, setRows] = useState<MuseumSectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("museum_sections")
        .select("*")
        .order("display_order");
      if (!error && data) setRows(data as MuseumSectionRow[]);
    } catch {
      /* keep fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const upsert = async (row: MuseumSectionRow) => {
    const { error } = await supabase
      .from("museum_sections")
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (!error) await load();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("museum_sections").delete().eq("id", id);
    if (!error) await load();
    return !error;
  };

  return { sections: rows, loading, reload: load, upsert, remove };
}
