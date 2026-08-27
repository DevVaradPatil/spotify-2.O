"use client";

import AddToPlaylist from "@/components/AddToPlaylist";
import AuthModal from "@/components/AuthModal";
import PlaylistModal from "@/components/PlaylistModal";
import SubscribeModal from "@/components/SubscribeModal";
import UploadModal from "@/components/UploadModal";
import { ProductWithPrice } from "@/types";

interface ModalProviderProps {
  products: ProductWithPrice[];
}

const ModalProvider: React.FC<ModalProviderProps> = ({ products }) => {
  // The isMounted guard that used to live here set state synchronously in an
  // effect. It was also unnecessary: every modal store starts isOpen:false on
  // both server and client, so there is no hydration mismatch to guard.
  return (
    <>
      <AuthModal />
      <UploadModal />
      <SubscribeModal products={products} />
      <PlaylistModal />
    </>
  );
};

export default ModalProvider;
