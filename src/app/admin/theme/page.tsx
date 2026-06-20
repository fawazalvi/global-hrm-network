import ThemeManagementPage from "@/frontend/components/admin/theme-management";
import { db } from "@/backend/db";

export default async function ThemePage() {
    let logoUrl: string | null = null;
    try {
      const config = await db.globalConfig.findUnique({
        where: { id: "global" }
      });
      if (config) {
        logoUrl = config.logoUrl;
      }
    } catch (error) {
      console.error("Error reading logo in ThemePage:", error);
    }

    return <ThemeManagementPage initialLogoUrl={logoUrl} />;
}
