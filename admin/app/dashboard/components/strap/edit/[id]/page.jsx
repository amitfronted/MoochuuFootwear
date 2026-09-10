import ComponentEditForm from '@/app/components/ComponentEditor/ComponentEditForm';

export default async function StrapEditPage({ params }) {
  const { id } = await params;
  return <ComponentEditForm type="strap" id={id} />;
}
