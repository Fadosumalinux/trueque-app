import { useState } from "react";
import BottomNav from "../components/BottomNav";
import DiscoverPage from "./DiscoverPage";
import ListingsPage from "./ListingsPage";
import ExchangesPage from "./ExchangesPage";
import WalletPage from "./WalletPage";
import ProfilePage from "./ProfilePage";

export type Tab = "discover" | "listings" | "exchanges" | "wallet" | "profile";

export default function MainApp() {
  const [tab, setTab] = useState<Tab>("discover");

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 72 }}>
      {tab === "discover" && <DiscoverPage />}
      {tab === "listings" && <ListingsPage />}
      {tab === "exchanges" && <ExchangesPage />}
      {tab === "wallet" && <WalletPage />}
      {tab === "profile" && <ProfilePage />}
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
