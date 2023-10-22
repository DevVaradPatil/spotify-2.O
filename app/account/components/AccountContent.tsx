"use client";

import Button from "@/components/Button";
import ListItem from "@/components/ListItem";
import useSubscribeModal from "@/hooks/useSubscribeModal";
import { useUser } from "@/hooks/useUser";
import { postData } from "@/libs/helpers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
      <h2 className="text-2xl font-semibold mb-4 truncate">Hey {user?.email}</h2>
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
