"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import {
  buildObjectKey,
  playlistFormSchema,
  validateFile,
} from "@/libs/uploadValidation";
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

      if (!user) {
        setIsLoading(false);
        return toast.error("You must be signed in to create a playlist.");
      }

      const fields = playlistFormSchema.safeParse({
        name: values.name,
        desc: values.desc,
      });
      if (!fields.success) {
        setIsLoading(false);
        return toast.error(fields.error.issues[0].message);
      }

      const imageFile = values.image?.[0] as File | undefined;
      const imageProblem = validateFile(imageFile, "image");
      if (imageProblem) {
        setIsLoading(false);
        return toast.error(imageProblem);
      }

      const { data: imageData, error: imageError } = await supabaseClient.storage
        .from("images")
        // Previously interpolated `values.title`, a field this form does not
        // have, so every cover was uploaded as `image-undefined-<id>`.
        .upload(buildObjectKey(user.id, fields.data.name, imageFile!), imageFile!, {
          cacheControl: "3600",
          upsert: false,
        });

      if (imageError) {
        setIsLoading(false);
        return toast.error("Failed image upload!");
      }

      // Insert a new playlist into the 'playlists' table.
      const { error } = await supabaseClient.from("playlists").insert({
        user_id: user.id,
        song_ids: [],
        name: fields.data.name,
        desc: fields.data.desc,
        image_path: imageData.path,
      });

      // This error was previously destructured and then never checked, so a
      // failed insert still reported "Playlist created!".
      if (error) {
        setIsLoading(false);
        return toast.error(error.message);
      }

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
