import { CATEGORY_LABEL, PACKAGE_CATEGORIES } from '@mcstore/shared';
import { api } from '@/lib/api';
import { ActionForm, Submit } from '@/components/form';
import { Field, PageHeader, Select } from '@/components/ui';
import { categoryAction, deleteCategoryAction } from '../../actions';

const TYPES = PACKAGE_CATEGORIES.map((t) => ({ value: t, label: CATEGORY_LABEL[t] }));

export default async function Categories({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await api<any[]>(`/stores/${slug}/categories`);
  return (
    <>
      <PageHeader title="Categories" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cats.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-end gap-2">
              <ActionForm action={categoryAction.bind(null, slug, c.id)} className="flex flex-1 flex-wrap items-end gap-2">
                <div className="flex-1"><Field label="Name" name="name" defaultValue={c.name} /></div>
                <Select label="Type" name="type" options={TYPES} defaultValue={c.type} />
                <div className="w-20"><Field label="Order" name="sort" type="number" defaultValue={c.sort} /></div>
                <Submit variant="secondary">Save</Submit>
              </ActionForm>
              <ActionForm action={deleteCategoryAction.bind(null, slug, c.id)}>
                <Submit variant="secondary" confirm={`Delete ${c.name}?`}>Delete ({c._count.packages})</Submit>
              </ActionForm>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="mb-4 font-medium">New category</h2>
          <ActionForm action={categoryAction.bind(null, slug, null)} reset>
            <Field label="Name" name="name" required />
            <Select label="Type" name="type" options={TYPES} />
            <Field label="Display order" name="sort" type="number" defaultValue={0} />
            <Submit>Create</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
