import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface WatchItem {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
}

export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("watchlist")
      .select("id, coin_id, coin_symbol, coin_name")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async (c: { id: string; symbol: string; name: string }) => {
    if (!user) {
      toast.error("Sign in to save your watchlist");
      return;
    }
    const { error } = await supabase.from("watchlist").insert({
      user_id: user.id,
      coin_id: c.id,
      coin_symbol: c.symbol,
      coin_name: c.name,
    });
    if (error) {
      if (error.code === "23505") toast.info("Already in watchlist");
      else toast.error(error.message);
    } else {
      toast.success(`Added ${c.name}`);
      refresh();
    }
  };

  const remove = async (coin_id: string) => {
    if (!user) return;
    const { error } = await supabase.from("watchlist").delete().eq("coin_id", coin_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      refresh();
    }
  };

  const has = (coin_id: string) => items.some((i) => i.coin_id === coin_id);

  return { items, loading, add, remove, has, refresh };
}
