import { MatchChrome } from "@/components/MatchChrome";
import { MatchProvider } from "@/components/MatchProvider";
import { getBundle } from "@/lib/server/bundle";

export default async function MatchLayout({ children }: { children: React.ReactNode }) {
  const data = await getBundle();
  return (
    <MatchProvider data={data}>
      <div className="screen">{children}</div>
      <MatchChrome />
    </MatchProvider>
  );
}
