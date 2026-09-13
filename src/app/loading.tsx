import { ListPageSkeleton } from "@/components/Skeletons";

// 자기 loading.tsx 가 없는 모든 경로가 쓰는 기본 뼈대.
// 메뉴를 누른 순간 이 화면으로 바뀌므로, 서버가 느려도 "먹통" 느낌이 남지 않는다.
export default function Loading() {
  return <ListPageSkeleton cards={4} filters={false} />;
}
