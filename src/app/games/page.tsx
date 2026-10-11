import {
  CollectionPage,
  type SearchProps,
} from "@/features/games/collection-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "全部收藏" };
export default function Games(props: SearchProps) {
  return <CollectionPage {...props} mode="list" />;
}
