import { Sponsor } from "./types";

export const activeSponsors: Sponsor[] = [
    {
        id: "sponsorme",
        title: "Sponsor Olun!",
        description: "Kaf'Map'in sponsorluklar dışında bir geliri yoktur. Eğer bir işletme sahibiyseniz kendi mekanınızı öne çıkarmak için Premium alabilirsiniz. Eğer kullanıcıysanız bağış yapabilirsiniz. Şimdiden teşekkürler :)",
        linkUrl: "https://buymeacoffee.com/runterya",
        isActive: true,
        position: "bottom"
    }
];

export const getActiveSponsors = (): Sponsor[] => {
    return activeSponsors.filter(s => s.isActive);
};
