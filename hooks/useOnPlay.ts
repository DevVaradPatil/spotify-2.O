import { Song } from "@/types";
import usePlayer from "./usePlayer";
import useAuthModal from "./useAuthModel";
import { useUser } from "./useUser";
import useSubscribeModal from "./useSubscribeModal";

const useOnPlay = (songs: Song[]) => {
  const setId = usePlayer((state) => state.setId);
  const setIds = usePlayer((state) => state.setIds);
  const authModal = useAuthModal();
  const { user, subscription } = useUser();
  const subscribeModal = useSubscribeModal();

  const onPlay = (id: number) => {
    if (!user) {
      return authModal.onOpen();
    }

    // if(!subscription) {
    //     return subscribeModal.onOpen();
    // }

    setId(id);
    setIds(songs.map((song) => song.id));
  };

  return onPlay;
};

export default useOnPlay;
