import React, { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Check, ChevronLeft, ChevronRight, Edit3, ImagePlus, Package, Plus, Save, Trash2, X } from 'lucide-react';
import { useBrands, useCategoryTree, useCreateProduct, usePublicConfig, useSellerProducts } from '../../lib/query-hooks';
import { useAuthStore } from '../../lib/auth-store';
import { api, del, post, put } from '../../lib/api-enhanced';
import { assetUrl, storedUploadPath } from '../../lib/assets';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../shared/DataTable';
import toast from 'react-hot-toast';

const statusStyles: Record<string, string> = { DRAFT: 'badge-neutral', ACTIVE: 'badge-success', INACTIVE: 'badge-warning', ARCHIVED: 'badge-error' };

const emptyForm = {
  title: '',
  slug: '',
  description: '',
  categoryId: '',
  brandId: '',
  basePrice: 0,
  discountPrice: null as number | null,
  costPrice: null as number | null,
  currency: 'TZS',
  status: 'DRAFT',
  images: [] as any[],
  unit: 'item',
  minimumOrderQuantity: '1',
  originCountry: 'TZ',
  leadTimeDays: '2',
  manufactureDate: '',
  expiryDate: '',
  warranty: '',
  variants: [
    {
      sku: '',
      barcode: '',
      attributesText: 'Default',
      price: 0,
      discountPrice: null as number | null,
      stock: 0,
      lowStockThreshold: 5,
      weight: null as number | null,
      length: null as number | null,
      width: null as number | null,
      height: null as number | null,
    },
  ],
};
const defaultAcceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/avif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'];
const defaultAcceptedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.avif', '.bmp', '.tif', '.tiff', '.heic', '.heif'];

function flattenCategories(categories: any[], depth = 0): any[] {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...(category.children ? flattenCategories(category.children, depth + 1) : []),
  ]);
}

export default function SellerProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>(emptyForm);
  const qc = useQueryClient();

  const { data, isLoading } = useSellerProducts({ page, limit: 10, search });
  const { data: publicConfig } = usePublicConfig();
  const { data: catData } = useCategoryTree();
  const { data: brandData } = useBrands();
  const createProduct = useCreateProduct();
  const categories = useMemo(() => flattenCategories(catData?.data || []), [catData]);
  const brands = brandData?.data || [];
  const uploadConfig = publicConfig?.data?.['marketplace.uploads'] || {};
  const maxProductImages = Number(uploadConfig.maxProductImages || 8);
  const maxImageSizeMb = Number(uploadConfig.maxImageSizeMb || 15);
  const acceptedImageTypes = Array.from(new Set([
    ...defaultAcceptedImageTypes,
    ...(Array.isArray(uploadConfig.acceptedImageTypes) ? uploadConfig.acceptedImageTypes : []),
  ]));

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: any) => put(`/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated');
      setShowForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => del(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller', 'products'] }); toast.success('Product deleted'); },
  });

       const uploadImages = useMutation({
     mutationFn: async (files: FileList) => {
       if (form.images.length + files.length > maxProductImages) throw new Error(`You can add up to ${maxProductImages} product images`);
       Array.from(files).forEach((file) => {
         const dotIndex = file.name.lastIndexOf('.');
         const ext = dotIndex > -1 ? file.name.substring(dotIndex).toLowerCase() : '';
         if (!file.type.startsWith('image/') && !acceptedImageTypes.includes(file.type) && !defaultAcceptedImageExtensions.includes(ext)) throw new Error(`${file.name} is not an allowed image type`);
         if (file.size > maxImageSizeMb * 1024 * 1024) throw new Error(`${file.name} is larger than ${maxImageSizeMb}MB`);
       });
       const payload = new FormData();
       Array.from(files).forEach((file) => payload.append('images', file));
       // Use XMLHttpRequest to ensure proper multipart boundary handling
       // and bypass stale axios interceptors
       const token = useAuthStore.getState().accessToken;
       const res = await new Promise<any>((resolve, reject) => {
         const xhr = new XMLHttpRequest();
         xhr.open('POST', '/api/upload/images');
         xhr.setRequestHeader('Authorization', `Bearer ${token}`);
         xhr.onload = () => {
           try {
             const data = JSON.parse(xhr.responseText);
             if (xhr.status >= 200 && xhr.status < 300) {
               resolve(data);
             } else {
               reject(new Error(data.message || data.error || `Upload failed (${xhr.status})`));
             }
           } catch {
             reject(new Error(`Upload failed (${xhr.status})`));
           }
         };
         xhr.onerror = () => reject(new Error('Network error during upload'));
         xhr.send(payload);
       });
        return res.data;
     },
     onSuccess: (images: any[]) => {
       setForm((current: any) => ({ ...current, images: [...current.images, ...images].slice(0, maxProductImages) }));
       toast.success(`${images.length} image${images.length === 1 ? '' : 's'} uploaded`);
     },
     onError: (err: any) => {
       console.error('Image upload error:', err);
       toast.error(err.message || 'Image upload failed');
     },
   });

  const createBrand = useMutation({
    mutationFn: (name: string) => post('/brands', { name, isApproved: false }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      setForm((current: any) => ({ ...current, brandId: res.data.id }));
      setNewBrandName('');
      toast.success('Brand added for this listing');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Could not add brand'),
  });

  const products = data?.data || [];
  const pagination = data?.pagination;
  const totalStock = form.variants.reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0);
  const margin = form.basePrice && form.costPrice ? (((Number(form.basePrice) - Number(form.costPrice)) / Number(form.basePrice)) * 100).toFixed(1) : null;

  const openCreate = () => {
    setEditingId(null);
    setStep(0);
    setForm({ ...emptyForm, variants: [{ ...emptyForm.variants[0] }] });
    setShowForm(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    setStep(0);
    const firstVariant = product.variants?.[0];
    setForm({
      ...emptyForm,
      title: product.title || '',
      slug: product.slug || '',
      description: product.description || '',
      categoryId: product.categoryId || product.category?.id || '',
      brandId: product.brandId || product.brand?.id || '',
      basePrice: product.basePrice || 0,
      discountPrice: product.discountPrice,
      costPrice: product.costPrice,
      currency: product.currency || 'TZS',
      status: product.status || 'DRAFT',
      images: product.images || [],
      variants: product.variants?.length ? product.variants.map((variant: any) => ({
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        attributesText: variant.attributes || 'Default',
        price: variant.price || product.basePrice || 0,
        discountPrice: variant.discountPrice,
        stock: variant.stock || 0,
        lowStockThreshold: variant.lowStockThreshold || 5,
        weight: variant.weight,
        length: null,
        width: null,
        height: null,
      })) : [{ ...emptyForm.variants[0], price: product.basePrice || 0, stock: firstVariant?.stock || 0 }],
    });
    setShowForm(true);
  };

  const validateStep = (targetStep = step) => {
    if (targetStep === 0 && (!form.title.trim() || !form.description.trim())) return 'Title and description are required';
    if (targetStep === 1 && !form.categoryId) return 'Choose a category or subcategory';
    if (targetStep === 2) {
      if (Number(form.basePrice) <= 0) return 'Selling price must be greater than zero';
      if (form.costPrice && Number(form.costPrice) > Number(form.basePrice)) return 'Buying price should not be greater than selling price';
    }
    if (targetStep === 3) {
      if (!form.variants.length) return 'Add at least one stock variant';
      if (form.variants.some((variant: any) => !variant.sku.trim())) return 'Every variant needs a SKU';
      if (form.variants.some((variant: any) => Number(variant.stock) < 0)) return 'Stock cannot be negative';
      if (form.status === 'ACTIVE' && totalStock <= 0) return 'Active products need stock';
    }
    return null;
  };

  const nextStep = () => {
    const error = validateStep();
    if (error) return toast.error(error);
    setStep(Math.min(step + 1, steps.length - 1));
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    ...(form.slug.trim() && { slug: form.slug.trim() }),
    description: form.description.trim(),
    categoryId: form.categoryId || null,
    brandId: form.brandId || null,
    basePrice: Number(form.basePrice),
    discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
    costPrice: form.costPrice ? Number(form.costPrice) : null,
    currency: form.currency || 'TZS',
    status: form.status,
    specifications: {
      unit: form.unit,
      minimumOrderQuantity: String(form.minimumOrderQuantity || 1),
      originCountry: form.originCountry,
      leadTimeDays: String(form.leadTimeDays || 0),
      manufactureDate: form.manufactureDate,
      expiryDate: form.expiryDate,
      warranty: form.warranty,
      createdBySellerAt: new Date().toISOString(),
    },
    images: form.images.map((image: any, index: number) => ({ url: storedUploadPath(image), alt: image.alt || form.title, isPrimary: index === 0, sortOrder: index })),
    variants: form.variants.map((variant: any, index: number) => ({
      sku: variant.sku.trim() || `${form.title.replace(/\s+/g, '-').toUpperCase()}-${index + 1}`,
      barcode: variant.barcode || undefined,
      attributes: { option: variant.attributesText || 'Default', unit: form.unit },
      price: Number(variant.price || form.basePrice),
      discountPrice: variant.discountPrice ? Number(variant.discountPrice) : null,
      stock: Number(variant.stock || 0),
      lowStockThreshold: Number(variant.lowStockThreshold || 5),
      weight: variant.weight ? Number(variant.weight) : null,
      dimensions: variant.length || variant.width || variant.height ? {
        length: Number(variant.length || 0),
        width: Number(variant.width || 0),
        height: Number(variant.height || 0),
        unit: 'cm',
      } : undefined,
      isActive: true,
    })),
  });

  const handleSubmit = () => {
    for (let index = 0; index < steps.length - 1; index += 1) {
      const error = validateStep(index);
      if (error) {
        setStep(index);
        return toast.error(error);
      }
    }
    const payload = buildPayload();
    if (editingId) updateProduct.mutate({ id: editingId, data: payload });
    else createProduct.mutate(payload, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['seller', 'products'] });
        qc.invalidateQueries({ queryKey: ['products'] });
        setShowForm(false);
      },
    });
  };

  const updateVariant = (index: number, patch: any) => {
    setForm({ ...form, variants: form.variants.map((variant: any, i: number) => i === index ? { ...variant, ...patch } : variant) });
  };

  const steps = [
    { label: 'Basics', hint: 'Name, description, media' },
    { label: 'Catalog', hint: 'Category, brand, unit' },
    { label: 'Pricing', hint: 'Buying and selling prices' },
    { label: 'Stock', hint: 'SKU, quantity, validation' },
    { label: 'Review', hint: 'Publish readiness' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Products ({pagination?.total || 0})</h2>
          <p className="text-sm text-gray-500">Build rich catalog listings with pricing, inventory, media, and category data.</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Product</button>
      </div>

      <DataTable
        columns={[
          { key: 'images', label: 'Image', render: (val: any) => val?.[0]?.url ? <img src={assetUrl(val[0].url)} className="h-10 w-10 rounded object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100"><Package className="h-5 w-5 text-gray-300" /></div> },
          { key: 'title', label: 'Title', sortable: true },
          { key: 'basePrice', label: 'Selling Price', sortable: true, render: (val: number) => `${val?.toLocaleString()} TZS` },
          { key: 'stock', label: 'Stock', render: (_: any, row: any) => row.variants?.reduce((a: number, v: any) => a + v.stock, 0) || 0 },
          { key: 'status', label: 'Status', render: (val: string) => <span className={statusStyles[val] || 'badge-neutral'}>{val}</span> },
          { key: 'id', label: 'Actions', render: (_: any, row: any) => (
            <div className="flex gap-1">
              <button onClick={() => openEdit(row)} className="rounded p-1.5 hover:bg-gray-100"><Edit3 className="h-4 w-4 text-gray-500" /></button>
              <button onClick={() => deleteProduct.mutate(row.id)} className="rounded p-1.5 hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-500" /></button>
            </div>
          ) },
        ]}
        data={products}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        emptyTitle="No products yet"
        emptyDescription="Add your first product to start selling"
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3" onClick={() => setShowForm(false)}>
          <div className="grid max-h-[94vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-lg bg-white shadow-xl lg:grid-cols-[280px_1fr]" onClick={e => e.stopPropagation()}>
            <aside className="border-b border-gray-200 bg-gray-50 p-4 lg:border-b-0 lg:border-r">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Product' : 'Create Product'}</h3>
                  <p className="text-sm text-gray-500">Step {step + 1} of {steps.length}</p>
                </div>
                <button onClick={() => setShowForm(false)} className="rounded p-1 hover:bg-gray-200"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-2">
                {steps.map((item, index) => (
                  <button key={item.label} onClick={() => setStep(index)} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left ${step === index ? 'bg-primary-600 text-white' : 'hover:bg-white'}`}>
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step > index ? 'bg-green-500 text-white' : step === index ? 'bg-white text-primary-600' : 'bg-gray-200 text-gray-600'}`}>
                      {step > index ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className={`block text-xs ${step === index ? 'text-primary-100' : 'text-gray-500'}`}>{item.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <main className="overflow-y-auto p-5">
              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Product name</span><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" /></label>
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Slug</span><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="input-field" placeholder="optional-custom-url" /></label>
                  </div>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Description</span><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="textarea-field" rows={5} /></label>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Product images</span>
                      <span className="text-xs text-gray-500">{form.images.length}/{maxProductImages} images, {maxImageSizeMb}MB max</span>
                    </div>
                    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100">
                      <ImagePlus className="mb-2 h-7 w-7 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{uploadImages.isPending ? 'Uploading...' : 'Import product images'}</span>
                      <span className="mt-1 text-xs text-gray-500">Primary image is the first image</span>
                      <input type="file" accept={acceptedImageTypes.join(',')} multiple className="hidden" disabled={uploadImages.isPending || form.images.length >= maxProductImages} onChange={(event) => { if (event.target.files?.length) uploadImages.mutate(event.target.files); event.currentTarget.value = ''; }} />
                    </label>
                    {form.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-8">
                        {form.images.map((image: any, index: number) => (
                          <div key={`${image.url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <img src={assetUrl(image.previewUrl || image.url || image.path)} alt={form.title || 'Product'} className="h-full w-full object-cover" />
                            <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_: any, i: number) => i !== index) })} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-gray-600 shadow hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Category / subcategory</span><select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="select-field"><option value="">Choose category</option>{categories.map((cat: any) => <option key={cat.id} value={cat.id}>{`${'--'.repeat(cat.depth)} ${cat.name}`}</option>)}</select></label>
                  <div>
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Brand</span><select value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })} className="select-field"><option value="">No brand</option>{brands.map((brand: any) => <option key={brand.id} value={brand.id}>{brand.name}{brand.isApproved ? '' : ' (pending)'}</option>)}</select></label>
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} className="input-field py-2" placeholder="Add a new brand name" />
                      <button type="button" onClick={() => newBrandName.trim() && createBrand.mutate(newBrandName.trim())} disabled={createBrand.isPending || !newBrandName.trim()} className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Brand</button>
                    </div>
                  </div>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Sell by</span><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="select-field"><option value="item">Per item</option><option value="piece">Per piece</option><option value="box">Per box</option><option value="kg">Per kilogram</option><option value="carton">Per carton</option></select></label>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Minimum order quantity</span><input type="number" value={form.minimumOrderQuantity} onChange={e => setForm({ ...form, minimumOrderQuantity: e.target.value })} className="input-field" /></label>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Origin country</span><input value={form.originCountry} onChange={e => setForm({ ...form, originCountry: e.target.value })} className="input-field" /></label>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Lead time days</span><input type="number" value={form.leadTimeDays} onChange={e => setForm({ ...form, leadTimeDays: e.target.value })} className="input-field" /></label>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Manufacture date</span><input type="date" value={form.manufactureDate} onChange={e => setForm({ ...form, manufactureDate: e.target.value })} className="input-field" /></label>
                  <label><span className="mb-1 block text-sm font-medium text-gray-700">Expiry date</span><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="input-field" /></label>
                  <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium text-gray-700">Warranty / policy note</span><input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} className="input-field" /></label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Buying price</span><input type="number" value={form.costPrice || ''} onChange={e => setForm({ ...form, costPrice: e.target.value ? Number(e.target.value) : null })} className="input-field" /></label>
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Selling price</span><input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: Number(e.target.value), variants: form.variants.map((v: any) => ({ ...v, price: v.price || Number(e.target.value) })) })} className="input-field" /></label>
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Discount price</span><input type="number" value={form.discountPrice || ''} onChange={e => setForm({ ...form, discountPrice: e.target.value ? Number(e.target.value) : null })} className="input-field" /></label>
                    <label><span className="mb-1 block text-sm font-medium text-gray-700">Currency</span><select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="select-field"><option value="TZS">TZS</option><option value="USD">USD</option><option value="KES">KES</option></select></label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="card p-4"><p className="text-sm text-gray-500">Estimated margin</p><p className="mt-1 text-2xl font-semibold text-gray-900">{margin ? `${margin}%` : '-'}</p></div>
                    <div className="card p-4"><p className="text-sm text-gray-500">Customer price</p><p className="mt-1 text-2xl font-semibold text-primary-600">{(form.discountPrice || form.basePrice || 0).toLocaleString()} {form.currency}</p></div>
                    <div className="card p-4"><p className="text-sm text-gray-500">Pricing rule</p><p className="mt-1 text-sm font-medium text-gray-900">Buying price stays private to the seller.</p></div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><h4 className="font-semibold">Stock variants</h4><p className="text-sm text-gray-500">Use variants for sizes, colors, packs, or wholesale tiers.</p></div>
                    <button className="btn-secondary btn-sm" onClick={() => setForm({ ...form, variants: [...form.variants, { ...emptyForm.variants[0], price: form.basePrice }] })}><Plus className="h-4 w-4" /> Add variant</button>
                  </div>
                  {form.variants.map((variant: any, index: number) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-medium">Variant {index + 1}</p>
                        {form.variants.length > 1 && <button onClick={() => setForm({ ...form, variants: form.variants.filter((_: any, i: number) => i !== index) })} className="text-red-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">SKU</span><input value={variant.sku} onChange={e => updateVariant(index, { sku: e.target.value })} className="input-field" /></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Option</span><input value={variant.attributesText} onChange={e => updateVariant(index, { attributesText: e.target.value })} className="input-field" placeholder="Red / Large / 10 pack" /></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Variant price</span><input type="number" value={variant.price} onChange={e => updateVariant(index, { price: Number(e.target.value) })} className="input-field" /></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Stock</span><input type="number" value={variant.stock} onChange={e => updateVariant(index, { stock: Number(e.target.value) })} className="input-field" /></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Low stock alert</span><input type="number" value={variant.lowStockThreshold} onChange={e => updateVariant(index, { lowStockThreshold: Number(e.target.value) })} className="input-field" /></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Weight</span><input type="number" value={variant.weight || ''} onChange={e => updateVariant(index, { weight: e.target.value ? Number(e.target.value) : null })} className="input-field" /></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Dimensions L/W/H</span><div className="grid grid-cols-3 gap-1"><input type="number" value={variant.length || ''} onChange={e => updateVariant(index, { length: e.target.value ? Number(e.target.value) : null })} className="input-field px-2" /><input type="number" value={variant.width || ''} onChange={e => updateVariant(index, { width: e.target.value ? Number(e.target.value) : null })} className="input-field px-2" /><input type="number" value={variant.height || ''} onChange={e => updateVariant(index, { height: e.target.value ? Number(e.target.value) : null })} className="input-field px-2" /></div></label>
                        <label><span className="mb-1 block text-xs font-medium text-gray-600">Barcode</span><input value={variant.barcode} onChange={e => updateVariant(index, { barcode: e.target.value })} className="input-field" /></label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="card p-4"><p className="text-sm text-gray-500">Total stock</p><p className="mt-1 text-2xl font-semibold">{totalStock}</p></div>
                    <div className="card p-4"><p className="text-sm text-gray-500">Variants</p><p className="mt-1 text-2xl font-semibold">{form.variants.length}</p></div>
                    <div className="card p-4"><p className="text-sm text-gray-500">Images</p><p className="mt-1 text-2xl font-semibold">{form.images.length}</p></div>
                    <label className="card block p-4"><span className="mb-1 block text-sm text-gray-500">Publish status</span><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="select-field"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></label>
                  </div>
                  {form.status === 'ACTIVE' && totalStock <= 0 && <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"><AlertTriangle className="h-4 w-4" /> Active products should have stock.</div>}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h4 className="mb-2 font-semibold">{form.title || 'Untitled product'}</h4>
                    <p className="text-sm text-gray-600">{form.description || 'No description yet.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="badge-neutral">{categories.find((cat: any) => cat.id === form.categoryId)?.name || 'No category'}</span>
                      <span className="badge-neutral">{(form.discountPrice || form.basePrice || 0).toLocaleString()} {form.currency}</span>
                      <span className="badge-neutral">{form.unit}</span>
                      <span className={statusStyles[form.status] || 'badge-neutral'}>{form.status}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
                <button onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="btn-secondary"><ChevronLeft className="h-4 w-4" /> Back</button>
                {step < steps.length - 1 ? (
                  <button onClick={nextStep} className="btn-primary">Continue <ChevronRight className="h-4 w-4" /></button>
                ) : (
                  <button onClick={handleSubmit} disabled={createProduct.isPending || updateProduct.isPending} className="btn-primary"><Save className="h-4 w-4" /> {editingId ? 'Update Product' : 'Create Product'}</button>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
