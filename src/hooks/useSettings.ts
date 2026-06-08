import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface GeneralSettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  sidebar_icon_url: string | null;
}

export const SETTINGS_UPDATED_EVENT = "agency:settings-updated";

export function useSettings() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);

  const fetch = useCallback(() => {
    api.get<{ data: GeneralSettings }>("/settings/general")
      .then(r => setSettings(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch();
    const handler = () => fetch();
    window.addEventListener(SETTINGS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, handler);
  }, [fetch]);

  return settings;
}
