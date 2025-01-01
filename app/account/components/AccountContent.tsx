"use client";

import Button from "@/components/Button";
import ListItem from "@/components/ListItem";
import useSubscribeModal from "@/hooks/useSubscribeModal";
import { useUser } from "@/hooks/useUser";
import { postData } from "@/libs/helpers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaGithub, FaEnvelope } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const AccountContent = () => {
  const router = useRouter();
  const subscribeModal = useSubscribeModal();
  const { isLoading, subscription, user } = useUser();

  const [Loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const redirectToCustomerPortal = async () => {
    setLoading(true);
    try {
      const { url, error } = await postData({
        url: "/api/create-portal-link",
      });
      window.location.assign(url);
    } catch (error) {
      return toast.error((error as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="mb-7 px-3 md:px-6">
      <h2 className="text-2xl font-semibold mb-4 truncate">Account Details</h2>
      <div className="flex items-center gap-4 mb-4">
        <img
          src={user?.user_metadata.avatar_url}
          alt="Avatar"
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h3 className="text-xl font-semibold">{user?.user_metadata.full_name}</h3>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Signed in with:</h3>
        <div className="flex gap-2">
          {user?.app_metadata.providers.includes("email") && (
            <FaEnvelope className="text-blue-500" size={24} />
          )}
          {user?.app_metadata.providers.includes("google") && (
            <FcGoogle className="text-red-500" size={24} />
          )}
          {user?.app_metadata.providers.includes("github") && (
            <FaGithub className="text-black" size={24} />
          )}
        </div>
      </div>
      {!subscription && (
        <div className="flex flex-col gap-y-4 w-full md:justify-start md:items-start justify-center items-center">
          <p>No Active plan.</p>
          <Button onClick={subscribeModal.onOpen} className="w-[300px]">
            Subscribe
          </Button>
        </div>
      )}
      {subscription && (
        <div className="flex flex-col gap-y-4 w-full justify-center md:justify-start md:items-start items-center">
          <p>
            You are currently on the{" "}
            <b>{subscription?.prices?.products?.name}</b> plan
          </p>
          <Button
            className="w-[300px]"
            disabled={Loading || isLoading}
            onClick={redirectToCustomerPortal}
          >
            Open Customer Portal
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mt-4">
        <ListItem image="/images/liked.png" name="Liked Songs" href="/liked" index={0}/>
        <ListItem
          image="/images/music.png"
          name="Your Library"
          href="/library"
          index={1}
        />
      </div>
    </div>
  );
};

export default AccountContent;
