import React from 'react';

const Loader = () => {
  return (
    <section className="py-10 w-full h-screen flex items-center justify-center">
      <div className="container flex items-center justify-center">
        <div className="three-body">
          <div className="three-body__dot"></div>
          <div className="three-body__dot"></div>
          <div className="three-body__dot"></div>
        </div>
      </div>
    </section>
  );
};

export default Loader;
