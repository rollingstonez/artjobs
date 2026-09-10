import ArtistProfileForm from "@/components/forms/ArtistProfileForm";
import OrgProfileForm from "@/components/forms/OrgProfileForm";
import { Notice } from "@/components/forms/ui";
import { requireUser } from "@/lib/auth";

export default async function MyProfilePage({ searchParams }: PageProps<"/me/profile">) {
  const me = await requireUser("/me/profile");
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      {sp.welcome && (
        <Notice kind="success">
          가입을 환영합니다! {me.profile.role === "artist" ? "프로필을 채우면 내 집 근처 공고 알림과 인재정보 공개를 쓸 수 있습니다." : "기관 정보를 채운 뒤 공고를 올릴 수 있습니다."}
        </Notice>
      )}
      <h2 className="text-lg font-bold">{me.profile.role === "artist" ? "내 프로필" : "기관 정보"}</h2>
      {me.profile.role === "artist" && me.artist && (
        <ArtistProfileForm profile={me.artist} displayName={me.profile.display_name} />
      )}
      {me.profile.role === "organization" && me.org && <OrgProfileForm profile={me.org} />}
    </div>
  );
}
