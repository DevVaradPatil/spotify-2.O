import Header from "@/components/Header";
import React from "react";
import ExploreContent from "./components/ExploreContent";
import getSongs from "@/actions/getSongs";

const ExploreAll = async() => {
  const songs = await getSongs();

  return (
    <div className="bg-neutral-900 rounded-lg h-full w-full overflow-hidden overflow-y-auto">
      <Header className="from-bg-neutral-900">
        <div className="mb-2 flex flex-col gap-y-6">
          <h1 className="text-white text-3xl font-semibold">
            Explore All Songs
          </h1>
        </div>
      </Header>
      <div className="px-3 md:px-6 pb-6">
      <ExploreContent songs={songs}/>
      </div>
    </div>
  );
};

export default ExploreAll;
