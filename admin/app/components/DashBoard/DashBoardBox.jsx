import React from 'react';

const DashBoardBox = ({ title, value, icon, iconColor, iconBgColor }) => {
  return (
    <div className="flex h-full group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-blue-300/50 bg-white backdrop-blur-xl rounded-2xl overflow-hidden">
      <div className="p-3.5 flex flex-col justify-between w-full relative z-10 bg-card">
        <div className="flex items-center justify-start mb-2 w-full">
          <div
            className={`flex items-center justify-center p-1.5 rounded-lg h-9 w-9 text-center shadow-inner transition-transform duration-300 group-hover:scale-110 ${iconColor} ${iconBgColor}`}
          >
            {icon}
          </div>
        </div>
        <div className="mt-auto pt-3">
          <h6 className="text-[14px] mb-0 font-medium text-muted-foreground flex items-center gap-1.5">
            <span>{title}</span>
          </h6>
          <p className="text-lg font-bold tracking-tight text-foreground leading-none mt-1">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashBoardBox;
