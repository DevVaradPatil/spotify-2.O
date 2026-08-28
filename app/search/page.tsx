import Header from "@/components/Header";
import SearchInput from "@/components/SearchInput";
import searchCatalog from "@/actions/searchCatalog";
import SearchContent from "./components/SearchContent";

interface SearchProps {
  // Dynamic APIs are async as of Next 15.
  searchParams: Promise<{
    title?: string;
  }>;
}

const Search = async ({ searchParams }: SearchProps) => {
  const { title = "" } = await searchParams;
  const { songs, artists } = await searchCatalog(title);

  return (
    <div className="bg-surface rounded-lg h-full w-full overflow-hidden overflow-y-auto">
      <Header className="from-bg-surface">
        <div className="mb-2 flex flex-col gap-y-6">
          <h1 className="text-white text-3xl font-semibold">Search</h1>
          <SearchInput initialValue={title} />
        </div>
      </Header>
      <SearchContent songs={songs} artists={artists} query={title} />
    </div>
  );
};

export default Search;
