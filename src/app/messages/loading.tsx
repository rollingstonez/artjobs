import { ListPageSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return <ListPageSkeleton cards={5} filters={false} />;
}
