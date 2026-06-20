import ApplicationQueue from "@/frontend/components/admin/application-queue";
import { db } from "@/backend/db";

export const revalidate = 0; // Disable cache to get live application list

export default async function AdminApplicationsPage() {
    // Fetch applications from PostgreSQL/MSSQL relational database
    const dbApplications = await db.application.findMany({
      orderBy: { submittedAt: 'desc' }
    });

    // Format Date properties to ISO strings to pass safely to client
    const applications = dbApplications.map((app: any) => ({
      ...app,
      submittedAt: app.submittedAt ? app.submittedAt.toISOString() : null,
    }));

    return (
        <ApplicationQueue initialApplications={applications as any} />
    );
}
