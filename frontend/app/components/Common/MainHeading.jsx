const MainHeading = ({ title, subtitle }) => {
  return (
    <div className="relative">
      <h3 className="text-2xl text-black capitalize font-medium items-start justify-start flex w-full flex-col">
        {title}
        <span className="text-md text-gray-800 font-normal">{subtitle}</span>
      </h3>
    </div>
  );
};

export default MainHeading;
