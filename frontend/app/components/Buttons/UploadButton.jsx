'use client';

import React from 'react';
import Button from '@mui/material/Button';
import { MdOutlineCloudUpload } from 'react-icons/md';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  width: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
});

const UploadButton = ({ onChange }) => {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    onChange?.(file);

    // Allows selecting the same file again
    event.target.value = '';
  };

  return (
    <Button
      component="label"
      variant="contained"
      startIcon={<MdOutlineCloudUpload />}
      sx={{
        width: '100%',
        maxWidth: '260px',
        backgroundColor: '#000',
        '&:hover': {
          backgroundColor: '#facc15',
          color: '#000',
        },
      }}
    >
      Upload Profile Image
      <VisuallyHiddenInput
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
      />
    </Button>
  );
};

export default UploadButton;
