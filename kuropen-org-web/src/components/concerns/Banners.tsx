import { useEffect, useState } from "react";

type BannerDefinition = {
    key: string;
    size: string;
    src: string;
}
type BannersDefinition = BannerDefinition[]
type BannersJsonSchema = {banners: BannersDefinition}
type BannersComponentProps = {
    site: string;
}

export function Banners (props: BannersComponentProps) {
    const [banners, setBanners] = useState<BannersDefinition>([]);
    const [currentBanner, setCurrentBanner] = useState<BannerDefinition | undefined>(undefined);
    const isMobile = navigator.userAgentData?.mobile || navigator.userAgent.toLowerCase().includes('mobile');

    useEffect(() => {
        fetch('/links/banners/list.json', {method: 'GET'})
        .then(res => res.json() as Promise<BannersJsonSchema>)
        .then(data => setBanners(data.banners))
    }, []);

    useEffect(() => {
        if (isMobile && !currentBanner && banners.length > 0) {
            setCurrentBanner(banners[0])
        }
    }, [banners, currentBanner, isMobile])
    
    return (
        <form className="flex flex-col gap-4">
            <div className="flex gap-4 items-center">
                <div className="font-bold">サイズ</div>
                { isMobile ? (
                    <select 
                        className="border rounded-lg p-1" 
                        onChange={e => setCurrentBanner(banners.find(el => el.key === e.currentTarget.value))}
                        value={currentBanner?.key}
                    >
                        {banners.map(banner => (
                            <option key={banner.key} value={banner.key}>{banner.size}</option>
                        ))}
                    </select>
                ) : banners.map(banner => (
                    <div key={banner.key}>
                        <input 
                            type="radio" 
                            className="form-radio mr-1" 
                            name="sizeSelect" 
                            id={`sizeSelect_${banner.key}`} 
                            value={banner.key} 
                            checked={banner.key === currentBanner?.key}
                            onChange={e => setCurrentBanner(banners.find(el => el.key === e.currentTarget.value))}
                        />
                        <label htmlFor={`sizeSelect_${banner.key}`}>
                            {banner.size}
                        </label>
                    </div>))}
            </div>
            {
                currentBanner ? (
                    <div className="flex flex-col gap-4">
                        <p><img className="border-2" src={currentBanner.src} alt={`バナー (${currentBanner.size})`} /></p>
                        <p className="text-sm">
                            バナーURL: {`${props.site}/links/banners/${currentBanner.key}`}
                        </p>
                    </div>
                ) : null
            }
        </form>
    )
}
