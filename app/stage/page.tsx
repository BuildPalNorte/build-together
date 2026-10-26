import { StageScreen } from "@/components/stage/StageScreen";

export const metadata = { title: "Build Together · Proyector" };

export default async function Page({ searchParams }: PageProps<"/stage">) {
  const { demo } = await searchParams;
  return <StageScreen demo={demo === "1"} />;
}
