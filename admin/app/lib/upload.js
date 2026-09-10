import api from './axios';

export const uploadSingleImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post('/upload/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
};

export const uploadMultipleImages = async (files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('images', file);
  });
  const res = await api.post('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.urls;
};
