const fs = require('fs');

const file = fs.readFileSync('src/app/page.tsx', 'utf8');
let newFile = file;

// import translation stuff
if (!newFile.includes("import { getTranslation }")) {
    newFile = newFile.replace(
        `import { useAuth } from "../hooks/useAuth";`,
        `import { useAuth } from "../hooks/useAuth";\nimport { getTranslation } from "../lib/translations";`
    );
}

// Ensure const t = getTranslation(language) is inside Home component
if (!newFile.includes("const t = getTranslation(language);")) {
    newFile = newFile.replace(
        `export default function Home() {`,
        `export default function Home() {\n    const [language, setLanguage] = useState<'tr' | 'en'>('tr');\n    const t = getTranslation(language);`
    );
    // remove existing language state to prevent duplicates
    newFile = newFile.replace(`const [language, setLanguage] = useState<'tr' | 'en'>('tr');\n    const [isThemeLoaded, setIsThemeLoaded] = useState(false);`, `const [isThemeLoaded, setIsThemeLoaded] = useState(false);`);
}

const replacements = {
    '"Search cafes or restaurants..."': '{t.searchPlaceholder}',
    '"Nearby Places"': '{t.nearbyPlaces}',
    '>Nearby Places<': '>{t.nearbyPlaces}<',
    '"No places found."': '{t.noPlacesFound}',
    '>No places found.<': '>{t.noPlacesFound}<',
    '>Unclaimed<': '>{t.unclaimed}<',
    '"Unclaimed"': '{t.unclaimed}',
    '>Menu<': '>{t.menu}<',
    '>Toilet Code<': '>{t.toiletCode}<',
    '>Free WiFi<': '>{t.freeWifi}<',
    '>No WiFi<': '>{t.noWifi}<',
    '>None Provided<': '>{t.noneProvided}<',
    '"Open Full Online Menu"': '{t.openFullMenu}',
    '>Open Full Online Menu<': '>{t.openFullMenu}<',
    '>Menu Snippet<': '>{t.menuSnippet}<',
    '>Last updated today<': '>{t.lastUpdatedToday}<',
    '>No menu prices submitted yet.<': '>{t.noMenuPrices}<',
    '>Update Info<': '>{t.updateInfo}<',
    '"Please log in to update info"': 't.loginToUpdate',
    '"Please log in to rate this place"': 't.loginToRate',
    '"You have already rated this place"': 't.alreadyRated',
    '"Rating submitted!"': 't.ratingSubmitted',
    '"Failed to submit rating"': 't.failedRating',
    '"Are you sure you want to report this place for inaccurate information or abuse?"': 't.reportConfirm',
    '"Place reported for review"': 't.reportSubmitted',
    '"Failed to submit report"': 't.failedReport',
    '>Zoom in to see cafes and restaurants<': '>{t.zoomInToSee}<',
    '>Scanning Area<': '>{t.scanningArea}<',
    '>Settings<': '>{t.settings}<',
    '>Appearance<': '>{t.appearance}<',
    '>Light<': '>{t.light}<',
    '>Dark<': '>{t.dark}<',
    '>Language<': '>{t.language}<',
    '>Login<': '>{t.login}<',
    '>Register<': '>{t.register}<',
    '>Create account<': '>{t.createAccount}<',
    '>Log out<': '>{t.logout}<',
    '>Signed in as<': '>{t.signedInAs}<',
    '>Locate me<': '>{t.locateMe}<',
    '>Refresh area<': '>{t.refreshArea}<',
    '>New<': '>{t.new}<',
    '"New"': 't.new'
};

for (const [key, val] of Object.entries(replacements)) {
    newFile = newFile.split(key).join(val);
}

// Special case for seeAllItems
// See all {selectedPlace.menu.length} items  -> {t.seeAllItems.replace('{count}', selectedPlace.menu.length.toString())}
newFile = newFile.replace(
    `> See all {selectedPlace.menu.length} items<`,
    `> {t.seeAllItems.replace('{count}', selectedPlace.menu.length.toString())} <`
);

fs.writeFileSync('src/app/page.tsx', newFile);
console.log("Translations injected into page.tsx");
