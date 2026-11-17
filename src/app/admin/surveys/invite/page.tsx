import { Suspense } from 'react';
import LeadOutreachDashboard from '@/frontend/components/admin/leads/lead-outreach-dashboard';

export default function LeadOutreachManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading Lead &amp; Outreach Management...</div>}>
      <LeadOutreachDashboard />
    </Suspense>
  );
}
