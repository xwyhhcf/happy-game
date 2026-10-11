import {
  CollectionPage,
  type SearchProps,
} from "@/features/games/collection-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "按人数选游" };
export default function Pick(props: SearchProps) {
  return <CollectionPage {...props} mode="pick" />;
}
