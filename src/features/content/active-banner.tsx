import { getLocale } from "next-intl/server";
import { getActiveBanners } from "@/features/content/managed-content";
import type { AppLocale } from "@/shared/i18n/config";

export async function ActiveBanner({ placement }: { placement: string }) {
  const banners = await getActiveBanners(placement, (await getLocale()) as AppLocale);
  if (!banners?.length) return null;

  return (
    <section className="active-banners" aria-label="Promotions">
      {banners.map((banner) => {
        const image = <picture><source media="(max-width: 640px)" srcSet={banner.mobile_image_path || banner.image_path} /><img src={banner.image_path} alt="" /></picture>;
        return banner.target_url ? <a key={banner.id} href={banner.target_url} target="_blank" rel="noopener noreferrer" aria-label="Open promotion">{image}</a> : <div key={banner.id}>{image}</div>;
      })}
    </section>
  );
}
