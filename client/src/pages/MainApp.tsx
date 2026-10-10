import { useState } from "react";
import BottomNav from "../components/BottomNav";
import Tutorial from "../components/Tutorial";
import DiscoverPage from "./DiscoverPage";
import ListingsPage from "./ListingsPage";
import ExchangesPage from "./ExchangesPage";
import WalletPage from "./WalletPage";
import ProfilePage from "./ProfilePage";

export type Tab = "discover" | "listings" | "exchanges" | "wallet" | "profile";

export default function MainApp() {
  const [tab, setTab] = useState<Tab>("discover");

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === "discover" && <DiscoverPage />}
        {tab === "listings" && <ListingsPage />}
        {tab === "exchanges" && <ExchangesPage />}
        {tab === "wallet" && <WalletPage />}
        {tab === "profile" && <ProfilePage />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
      <Tutorial tab={tab} />
    </div>
  );
}
