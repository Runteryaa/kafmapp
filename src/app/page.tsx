import dynamic from "next/dynamic";
import { MapPin, Search, Compass, LogIn } from "lucide-react";

// Dynamically import the Map component with ssr: false
// This is necessary because Leaflet uses the window object
const MapComponent = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full bg-zinc-100 animate-pulse">
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <MapPin size={48} className="animate-bounce" />
        <p className="text-xl font-medium tracking-tight">Loading kaf&apos;map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-zinc-950 selection:bg-rose-200">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-inner">
            <MapPin className="text-white drop-shadow-sm" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-500">
            kaf&apos;map
          </h1>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative flex items-center w-full h-12 rounded-full bg-zinc-100 hover:bg-zinc-200/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-400/50 focus-within:shadow-md transition-all duration-300">
                <Search className="absolute left-4 text-zinc-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search cafes or restaurants..." 
                    className="w-full h-full bg-transparent pl-12 pr-4 outline-none text-zinc-700 placeholder:text-zinc-400 font-medium"
                />
            </div>
        </div>

        <div className="flex items-center gap-4">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors">
                <Compass size={18} />
                Explore
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95">
                <LogIn size={18} />
                Sign In
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-73px)] overflow-hidden bg-zinc-50 relative">
        
        {/* Sidebar overlay for mobile (optional in full version, hidden for demo) */}
        
        {/* Map Container */}
        <div className="relative flex-1 h-full w-full z-0 p-2 md:p-4">
            <div className="h-full w-full rounded-2xl overflow-hidden border border-zinc-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
                 <MapComponent />
            </div>
        </div>

        {/* Floating action button for quick add */}
        <button className="absolute bottom-8 right-8 z-50 flex items-center justify-center w-14 h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
             <MapPin size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </main>
    </div>
  );
}
