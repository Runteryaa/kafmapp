import { Sponsor } from "./types";

// Aktif sponsorluk anlaşmalarını buradan yönetebilirsin.
// Yeni bir sponsor geldiğinde bu listeye ekleyip isActive: true yapman yeterli.
export const activeSponsors: Sponsor[] = [
    {
        id: "referrun-sponsor",
        title: "referRun",
        description: "En popüler uygulamaların güncel referans kodlarını keşfedin! Arkadaşlarınızı davet edin ve birlikte kazanmaya başlayın. referRun ile fırsatları kaçırmayın.",
        linkUrl: "https://referrun.runte.workers.dev",
        isActive: false,
        position: "bottom"
    }
];

export const getActiveSponsors = (): Sponsor[] => {
    return activeSponsors.filter(s => s.isActive);
};
