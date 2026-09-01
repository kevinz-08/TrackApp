import { listGoals } from "@/actions/goals";
import { GoalManager } from "@/components/goals/goal-manager";

export const metadata = { title: "Metas — TrackApp" };

export default async function GoalsPage() {
  const goals = await listGoals();
  return <GoalManager goals={goals} />;
}
