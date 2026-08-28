"use client";
import React, { useState } from "react";
import Modal from "./Modal";
import useUploadModal from "@/hooks/useUploadModal";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import Input from "./Input";
import Button from "./Button";
import toast from "react-hot-toast";
import { useUser } from "@/hooks/useUser";
import { useSupabaseClient } from "@/hooks/useSupabase";
import { useRouter } from "next/navigation";
import { buildObjectKey, songFormSchema, validateFile } from "@/libs/uploadValidation";
import { createSong } from "@/actions/mutations";

const UploadModal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const uploadModal = useUploadModal();
  const { user } = useUser();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: {
      author: "",
      title: "",
      song: null,
      image: null,
    },
  });
  const onChange = (open: boolean) => {
    if (!open) {
      reset();
      uploadModal.onClose();
    }
  };
  const onSubmit: SubmitHandler<FieldValues> = async (values) => {
    try {
      setIsLoading(true);

      const imageFile = values.image?.[0] as File | undefined;
      const songFile = values.song?.[0] as File | undefined;

      if (!user) {
        toast.error("You must be signed in to upload.");
        return;
      }

      const fields = songFormSchema.safeParse({
        title: values.title,
        author: values.author,
      });
      if (!fields.success) {
        setIsLoading(false);
        return toast.error(fields.error.issues[0].message);
      }

      const songProblem = validateFile(songFile, "audio");
      if (songProblem) {
        setIsLoading(false);
        return toast.error(songProblem);
      }

      const imageProblem = validateFile(imageFile, "image");
      if (imageProblem) {
        setIsLoading(false);
        return toast.error(imageProblem);
      }

      const { data: songData, error: songError } = await supabaseClient.storage
        .from("songs")
        .upload(buildObjectKey(user.id, fields.data.title, songFile!), songFile!, {
          cacheControl: "3600",
          upsert: false,
        });

      if (songError) {
        setIsLoading(false);
        return toast.error("Failed song upload!");
      }

      // Upload Image

      const { data: imageData, error: imageError } = await supabaseClient.storage
        .from("images")
        .upload(buildObjectKey(user.id, fields.data.title, imageFile!), imageFile!, {
          cacheControl: "3600",
          upsert: false,
        });

      if (imageError) {
        setIsLoading(false);
        return toast.error("Failed image upload!");
      }

      // The files are already in storage — only the metadata goes through the
      // server action, which re-validates it and busts the catalog cache.
      const result = await createSong({
        title: fields.data.title,
        author: fields.data.author,
        songPath: songData.path,
        imagePath: imageData.path,
      });

      if ("error" in result) {
        setIsLoading(false);
        return toast.error(result.error);
      }

      router.refresh();
      setIsLoading(false);
      toast.success("Song created!");
      reset();
      uploadModal.onClose();
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Modal
      title="Add a song"
      description="Upload an mp3 file"
      isOpen={uploadModal.isOpen}
      onChange={onChange}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
        <Input
          id="title"
          disabled={isLoading}
          {...register("title", { required: true })}
          placeholder="Song title"
        />
        <Input
          id="author"
          disabled={isLoading}
          {...register("author", { required: true })}
          placeholder="Song author"
        />
        <div>
          <div className="pb-1">Select a song file</div>
          <Input
            id="song"
            type="file"
            disabled={isLoading}
            accept="audio/mpeg,.mp3"
            {...register("song", { required: true })}
          />
        </div>
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
          {isLoading ? "Uploading..." : "Upload Song"}
        </Button>
      </form>
    </Modal>
  );
};

export default UploadModal;
