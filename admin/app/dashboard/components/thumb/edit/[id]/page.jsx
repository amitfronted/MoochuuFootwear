import ComponentEditForm from '@/app/components/ComponentEditor/ComponentEditForm';

export default async function ThumbEditPage({ params }) {
  const { id } = await params;
  return <ComponentEditForm type="thumb" id={id} />;
}
