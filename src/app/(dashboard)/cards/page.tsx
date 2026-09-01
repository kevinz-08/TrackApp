import { listCreditCards } from "@/actions/cards";
import { CardManager } from "@/components/cards/card-manager";

export const metadata = { title: "Tarjetas — TrackApp" };

export default async function CardsPage() {
  const cards = await listCreditCards();
  return <CardManager cards={cards} />;
}
