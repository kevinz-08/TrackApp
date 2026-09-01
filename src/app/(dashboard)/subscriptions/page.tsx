import { listSubscriptions } from "@/actions/subscriptions";
import { listCategories } from "@/actions/categories";
import { SubscriptionManager } from "@/components/subscriptions/subscription-manager";

export const metadata = { title: "Suscripciones — TrackApp" };

export default async function SubscriptionsPage() {
  const [summary, categories] = await Promise.all([listSubscriptions(), listCategories()]);
  return <SubscriptionManager summary={summary} categories={categories} />;
}
