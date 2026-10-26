import { HomeScreen } from "@/components/home/HomeScreen";

export default async function Page({ searchParams }: PageProps<"/">) {
  const { demo } = await searchParams;
  return <HomeScreen demo={demo === "1"} />;
}
