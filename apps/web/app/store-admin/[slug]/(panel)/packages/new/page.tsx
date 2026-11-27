import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { PackageForm } from '../package-form';

export default async function NewPackage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await api<any[]>(`/stores/${slug}/categories`);
  return (
    <>
      <PageHeader title="New package" />
      <div className="card max-w-3xl">
        {categories.length === 0 ? <p className="text-sm">Create a category first.</p> : <PackageForm slug={slug} categories={categories} />}
      </div>
    </>
  );
}
