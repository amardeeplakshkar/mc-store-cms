import { api } from '@/lib/api';
import { Submit } from '@/components/form';
import { PageHeader } from '@/components/ui';
import { PackageForm } from '../package-form';
import { deletePackageAction } from '../../../actions';

export default async function EditPackage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [pkg, categories] = await Promise.all([api(`/stores/${slug}/packages/${id}`), api<any[]>(`/stores/${slug}/categories`)]);
  return (
    <>
      <PageHeader title={`Edit ${pkg.name}`}>
        <form action={deletePackageAction.bind(null, slug, id)}>
          <Submit variant="danger" confirm="Delete this package? Packages with orders are disabled instead.">Delete</Submit>
        </form>
      </PageHeader>
      <div className="card max-w-3xl"><PackageForm slug={slug} categories={categories} pkg={pkg} /></div>
    </>
  );
}
