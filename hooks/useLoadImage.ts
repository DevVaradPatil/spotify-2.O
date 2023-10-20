import { useSupabaseClient } from "@supabase/auth-helpers-react";

const useLoadImage = (entityWithImage: { image_path: string } | null) => {
  const supabaseClient = useSupabaseClient();

  if (!entityWithImage) {
    return null;
  }

  const { data: imageData } = supabaseClient.storage.from('images').getPublicUrl(entityWithImage.image_path);

  return imageData ? imageData.publicUrl : null;
};

export default useLoadImage;
