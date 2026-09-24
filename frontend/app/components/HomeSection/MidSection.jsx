import Image from 'next/image';
import React from 'react';

const MidSection = () => {
  return (
    <section className="py-14">
      <div className="container px-6">
        <Image
          src="/midsecImage.png"
          width={2170}
          height={319}
          loading="eager"
          alt="information"
        />
      </div>
    </section>
  );
};

export default MidSection;
