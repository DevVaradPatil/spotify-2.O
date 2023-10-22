import React, { useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import uniqid from 'uniqid';
import Button from "./Button";
import usePlaylistModal from "@/hooks/usePlaylistModal";
import { useUser } from "@/hooks/useUser";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

const PlaylistModal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const playlistModal = usePlaylistModal();
  const { user } = useUser();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: {
      author: "",
      title: "",
    },
  });
  const onChange = (open: boolean) => {
    if (!open) {
      reset();
      playlistModal.onClose();
    }
  };
  const onSubmit: SubmitHandler<FieldValues> = async (values) => {
    try {
      setIsLoading(true);
  
      const user_id = user?.id;
      const name = values.name; // Corrected field name
      const desc = values.desc; // Corrected field name
      const imageFile = values.image?.[0];
      // Replace 'song_ids_here' with an array of song IDs for the playlist.
      const song_ids: any = [];
      const uniqueID = uniqid();

      const {
        data: imageData,
        error: imageError,
    } = await supabaseClient.storage.from('images').upload(`image-${values.title}-${uniqueID}`, imageFile, {
        cacheControl: '3600',
        upsert: false
    });

    if(imageError){
      setIsLoading(false);
      return toast.error("Failed image upload!");
  }
    const image_path = imageData.path;

      // Insert a new playlist into the 'playlists' table.
      const { data, error } = await supabaseClient.from("playlists").insert({
        user_id,
        song_ids,
        name,
        desc,
        image_path
      });
  
      router.refresh();
      setIsLoading(false);
      toast.success("Playlist created!"); // Updated success message
      reset();
      playlistModal.onClose();
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Modal
      title="Create a Playlist"
      description="Enter playlist details"
      isOpen={playlistModal.isOpen}
      onChange={onChange}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
        <Input
          id="name"
          disabled={isLoading}
          {...register("name", { required: true })}
          placeholder="Playlist Name"
        />
        <Input
          id="desc"
          disabled={isLoading}
          {...register("desc", { required: true })}
          placeholder="Playlist description"
        />
         <div>
          <div className="pb-1">Select an image</div>
          <Input
            id="image"
            type="file"
            disabled={isLoading}
            accept="image/*"
            {...register("image", { required: true })}
          />
        </div>

        <Button disabled={isLoading} type="submit">
          {isLoading ? "Creating..." : "Create"}
        </Button>
      </form>
    </Modal>
  );
};

export default PlaylistModal;
