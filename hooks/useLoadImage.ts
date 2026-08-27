import { useSupabaseClient } from "@/hooks/useSupabase";

const useLoadImage = (entityWithImage: { image_path: string | null } | null) => {
  const supabaseClient = useSupabaseClient();

  if (!entityWithImage?.image_path) {
    return null;
  }

  const { data: imageData } = supabaseClient.storage
    .from("images")
    .getPublicUrl(entityWithImage.image_path);

  return imageData ? imageData.publicUrl : null;
};

export default useLoadImage;
