const MyListPage = () => {
  return (
    <div className="w-full rounded-md bg-white shadow-md md:w-3/4">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-700">My List</h4>

          <p className="text-sm text-gray-500">
            There are 4 products in your My List
          </p>
        </div>
      </div>
      <div className="p-4">my List</div>
    </div>
  );
};

export default MyListPage;
