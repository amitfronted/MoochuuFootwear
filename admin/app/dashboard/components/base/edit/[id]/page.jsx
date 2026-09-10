import ComponentEditForm from '@/app/components/ComponentEditor/ComponentEditForm';

export default async function BaseEditPage({ params }) {
  const { id } = await params;
  return <ComponentEditForm type="base" id={id} />;
}
