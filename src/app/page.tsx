import {
  CollectionPage,
  type SearchProps,
} from "@/features/games/collection-page";
export const dynamic = "force-dynamic";
export default function Home(props: SearchProps) {
  return <CollectionPage {...props} mode="gallery" />;
}
