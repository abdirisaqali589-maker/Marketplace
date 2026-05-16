import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePublicConfig } from '../../lib/query-hooks';

export default function PublicPage() {
  const { slug } = useParams();
  const { data } = usePublicConfig();
  const pages = data?.data?.['site.pages'] || [];
  const page = Array.isArray(pages) ? pages.find((item: any) => item.slug === slug && item.isPublished !== false) : null;

  if (!page) {
    return (
      <div className="page-container py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Page not available</h1>
        <p className="mt-2 text-gray-500">This page can be created or published from Admin Settings.</p>
        <Link to="/" className="btn-primary mt-6">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="page-container max-w-4xl py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <article className="prose max-w-none">
          <h1 className="text-4xl font-bold tracking-normal text-gray-950">{page.title}</h1>
          <div className="mt-6 whitespace-pre-line rounded-lg border border-gray-200 bg-gray-50 p-6 text-base leading-8 text-gray-700">
            {page.body}
          </div>
        </article>
      </div>
    </div>
  );
}
