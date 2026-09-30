import { PageHeading } from "@/components/common/page-heading";
import { TeamSchedule } from "@/components/work-orders/team-schedule";

export default function TeamSchedulePage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Agenda de equipes" description="Calendário operacional das visitas e serviços programados." />
      <TeamSchedule />
    </div>
  );
}
