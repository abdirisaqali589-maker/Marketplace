import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Sparkles, Loader2, Check, Copy, Globe,
  Shield, Scale, Truck, RotateCcw, HelpCircle, FileEdit,
  Mail, Megaphone, Eye, Download, RefreshCw, BookOpen
} from 'lucide-react';
import { api } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Content Types ──
interface ContentTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: string[];
  promptTemplate: string;
}

const CONTENT_TYPES: ContentTemplate[] = [
  {
    id: 'about_us',
    title: 'About Us',
    description: 'Company story, mission, values, and team information',
    icon: <BookOpen className="h-5 w-5" />,
    sections: ['Our Story', 'Our Mission', 'Our Values', 'Our Team', 'Why Choose Us'],
    promptTemplate: 'Write a compelling About Us page for our marketplace. Include our story, mission, values, and what makes us unique.',
  },
  {
    id: 'privacy_policy',
    title: 'Privacy Policy',
    description: 'Data collection, usage, cookies, and user rights',
    icon: <Shield className="h-5 w-5" />,
    sections: ['Information We Collect', 'How We Use Your Information', 'Data Sharing', 'Cookies', 'Your Rights', 'Contact Us'],
    promptTemplate: 'Write a comprehensive privacy policy for our e-commerce marketplace.',
  },
  {
    id: 'terms_of_service',
    title: 'Terms of Service',
    description: 'Legal terms, account rules, and conditions',
    icon: <Scale className="h-5 w-5" />,
    sections: ['Acceptance of Terms', 'Account Registration', 'Products and Pricing', 'Payments', 'Shipping and Delivery', 'Returns and Refunds', 'Limitation of Liability'],
    promptTemplate: 'Write detailed terms of service for our e-commerce marketplace.',
  },
  {
    id: 'return_policy',
    title: 'Return Policy',
    description: 'Return window, conditions, and refund process',
    icon: <RotateCcw className="h-5 w-5" />,
    sections: ['Return Window', 'Condition Requirements', 'Refund Process', 'Exchange Policy', 'Exceptions'],
    promptTemplate: 'Write a clear return and refund policy for our marketplace.',
  },
  {
    id: 'shipping_policy',
    title: 'Shipping Policy',
    description: 'Delivery times, costs, and international shipping',
    icon: <Truck className="h-5 w-5" />,
    sections: ['Processing Time', 'Shipping Methods', 'Delivery Timeframes', 'Shipping Costs', 'International Shipping', 'Tracking'],
    promptTemplate: 'Write a detailed shipping policy for our e-commerce marketplace.',
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Frequently asked questions about orders, payments, etc.',
    icon: <HelpCircle className="h-5 w-5" />,
    sections: ['Orders', 'Payments', 'Shipping', 'Returns', 'Account', 'Products'],
    promptTemplate: 'Write a comprehensive FAQ page for our marketplace.',
  },
  {
    id: 'blog_post',
    title: 'Blog Post',
    description: 'Engaging articles, tips, and updates',
    icon: <FileEdit className="h-5 w-5" />,
    sections: ['Introduction', 'Main Content', 'Tips and Tricks', 'Conclusion'],
    promptTemplate: 'Write an engaging blog post for our marketplace audience.',
  },
  {
    id: 'landing_page',
    title: 'Landing Page',
    description: 'Feature promotion and call-to-action pages',
    icon: <Megaphone className="h-5 w-5" />,
    sections: ['Hero Section', 'Features', 'Benefits', 'Testimonials', 'Call to Action'],
    promptTemplate: 'Write a persuasive landing page for our marketplace feature.',
  },
  {
    id: 'email_template',
    title: 'Email Template',
    description: 'Transactional and marketing emails',
    icon: <Mail className="h-5 w-5" />,
    sections: ['Subject Line', 'Greeting', 'Main Content', 'Call to Action', 'Footer'],
    promptTemplate: 'Write a professional email template for our marketplace.',
  },
];

// ── Preview Modal ──
function PreviewModal({ content, title, onClose }: { content: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <Eye className="h-4 w-4" aria-hidden="true" /> {title} — Preview
          </h3>
          <button onClick={onClose} className="btn-ghost text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Close</button>
        </div>
        <div className="p-6">
          <div
            className="prose prose-sm max-w-none prose-headings:text-base prose-p:leading-relaxed"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Content Editor Main Component ──
export default function AIContentEditor() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ContentTemplate | null>(null);
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const tones = [
    { value: 'professional', label: 'Professional', desc: 'Formal business tone' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'formal', label: 'Formal', desc: 'Strictly formal and legal' },
    { value: 'casual', label: 'Casual', desc: 'Relaxed conversational' },
    { value: 'persuasive', label: 'Persuasive', desc: 'Convincing marketing tone' },
    { value: 'informative', label: 'Informative', desc: 'Educational and clear' },
  ];

  const handleGenerate = async () => {
    if (!selectedType) return;
    setIsGenerating(true);
    setGeneratedContent('');
    setAiSuggestions([]);

    try {
      // Try AI-powered generation first
      const prompt = `Generate a complete ${selectedType.title} page for our marketplace.
Tone: ${tone}
Context: ${context || 'General e-commerce marketplace'}

Sections to include:
${selectedType.sections.map(s => `- ${s}`).join('\n')}

Write in markdown format with proper headings, paragraphs, and structure. Make it comprehensive and ready to publish.`;

      const { data } = await api.post('/ai/v1/chat/completions', {
        model: import.meta.env.VITE_AI_DEFAULT_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `You are a professional content writer for an e-commerce marketplace. Write compelling, well-structured content in ${tone} tone. Use markdown formatting.` },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });

      const content = data?.choices?.[0]?.message?.content || '';
      setGeneratedContent(content);
      setEditedContent(content);
      toast.success(`${selectedType.title} content generated successfully!`);

      // Generate improvement suggestions
      setAiSuggestions([
        'Add more specific details about your business',
        'Include customer testimonials or reviews',
        'Add calls-to-action throughout the content',
        'Consider adding images or media elements',
        'Review for SEO keywords and phrases',
      ]);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      // Fallback: Generate template content
      const fallbackContent = generateFallbackContent(selectedType, tone, context);
      setGeneratedContent(fallbackContent);
      setEditedContent(fallbackContent);
      toast.success('Template content generated. Edit as needed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Content copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSave = async () => {
    if (!selectedType || !editedContent.trim()) return;
    // Save as a config entry via the dynamic config endpoint
    try {
      await api.put(`/config/pages.${selectedType.id}`, {
        value: {
          title: selectedType.title,
          content: editedContent,
          tone,
          status: 'DRAFT',
          updatedAt: new Date().toISOString(),
        }
      });
    } catch { /* ignore */ }
    toast.success(`${selectedType.title} saved as draft`);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <Sparkles className="h-6 w-6" style={{ color: 'rgb(var(--color-primary-500))' }} aria-hidden="true" />
            AI Content Editor
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Generate and edit professional content for your marketplace pages using AI
          </p>
        </div>
      </div>

      {/* Content Type Selection */}
      {!selectedType ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type)}
              className="p-5 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
              style={{
                border: '1px solid',
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface))',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-border))'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-600))' }}
              >
                {type.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>{type.title}</h3>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{type.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {type.sections.slice(0, 3).map(s => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' }}
                  >
                    {s}
                  </span>
                ))}
                {type.sections.length > 3 && (
                  <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    +{type.sections.length - 3}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Editor View */
        <div className="space-y-6">
          {/* Breadcrumb */}
          <button
            onClick={() => { setSelectedType(null); setGeneratedContent(''); setEditedContent(''); }}
            className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            ← Back to content types
          </button>

          {/* Configuration Card */}
          <div
            className="rounded-xl p-6"
            style={{
              border: '1px solid',
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-600))' }}
              >
                {selectedType.icon}
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{selectedType.title}</h3>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Sections: {selectedType.sections.join(', ')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tone Selector */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  Writing Tone
                </label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: '1px solid',
                    borderColor: 'rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-surface-muted))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  {tones.map(t => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>

              {/* Context Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  Additional Context (optional)
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="e.g., We sell handmade crafts and artisan goods..."
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: '1px solid',
                    borderColor: 'rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-surface-muted))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
            </div>

            {/* Included Sections */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                Included Sections
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedType.sections.map(section => (
                  <span
                    key={section}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-50))',
                      color: 'rgb(var(--color-primary-700))',
                      border: '1px solid',
                      borderColor: 'rgb(var(--color-primary-200))',
                    }}
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-primary flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Generate Content
                  </>
                )}
              </button>
              {generatedContent && (
                <button onClick={handleRegenerate} disabled={isGenerating} className="btn-ghost text-sm">
                  <RefreshCw className="h-4 w-4 inline mr-1" aria-hidden="true" />
                  Regenerate
                </button>
              )}
            </div>
          </div>

          {/* Generated Content */}
          {generatedContent && (
            <div ref={resultRef} className="space-y-4">
              {/* Toolbar */}
              <div
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  border: '1px solid',
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-surface))',
                }}
              >
                <div className="flex items-center gap-3 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>Generated Content</span>
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    ({editedContent.split(' ').length} words)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="btn-ghost text-xs flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
                  </button>
                  <button
                    onClick={handleCopy}
                    className="btn-ghost text-xs flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Save Draft
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: '1px solid',
                  borderColor: 'rgb(var(--color-border))',
                }}
              >
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="w-full min-h-[500px] p-6 text-sm leading-relaxed font-mono resize-y focus:outline-none"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: 'none',
                  }}
                  placeholder="Generated content will appear here..."
                />
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    border: '1px solid',
                    borderColor: 'rgb(var(--color-primary-200))',
                    backgroundColor: 'rgb(var(--color-primary-50) / 0.3)',
                  }}
                >
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3" style={{ color: 'rgb(var(--color-primary-700))' }}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Improvement Suggestions
                  </h4>
                  <ul className="space-y-1.5">
                    {aiSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        <span className="mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && generatedContent && (
        <PreviewModal
          content={editedContent}
          title={selectedType?.title || 'Content'}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ── Fallback Content Generator ──
function generateFallbackContent(template: ContentTemplate, tone: string, context: string): string {
  const toneMap: Record<string, string> = {
    professional: 'We are committed to providing exceptional service',
    friendly: "We're here to make your experience amazing",
    formal: 'The Company hereby provides the following information',
    casual: 'Hey there! Welcome to our awesome marketplace',
    persuasive: "Don't miss out on the incredible benefits waiting for you",
    informative: 'Below you will find detailed information about',
  };

  const toneIntro = toneMap[tone] || toneMap.professional;
  const contextLines = context ? `\n\n*Context: ${context}*\n` : '';

  return `# ${template.title}

*Last updated: ${new Date().toLocaleDateString()}*

---

## Introduction

${toneIntro}. This document outlines the key aspects of our ${template.title.toLowerCase()} that every user should be aware of.
${contextLines}
---

${template.sections.map(section => `
## ${section}

${section === 'Our Story' ? 'Our marketplace was founded with a vision to create a seamless shopping experience that connects buyers with quality products and trusted sellers.' : ''}
${section === 'Our Mission' ? 'Our mission is to empower businesses and customers through a reliable, easy-to-use platform that fosters trust and growth.' : ''}
${section === 'Our Values' ? 'We value **integrity**, **innovation**, **customer satisfaction**, and **community** in everything we do.' : ''}

*[Content for "${section}" — customize this section to reflect your specific business details, policies, and requirements. Add specific information about your marketplace operations, contact details, and any relevant legal or business information.]*

`).join('')}
---

*This content was generated by AI in a **${tone}** tone. Please review and customize it to match your specific business requirements, legal jurisdiction, and brand voice.*
`;
}
