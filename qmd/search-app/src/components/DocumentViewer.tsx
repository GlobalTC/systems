import { useState, useEffect } from 'react';
import { getDocumentContent } from '../services/mcpClient';
import { ArrowLeft, FileText, Loader2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentViewerProps {
    file: string;
    onClose: () => void;
}

export function DocumentViewer({ file, onClose }: DocumentViewerProps) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchDoc() {
            setLoading(true);
            setError(null);
            try {
                const result = await getDocumentContent(file);
                const contentArr = result.content as any[];
                if (contentArr && contentArr.length > 0) {
                    // Try to find text content first
                    const textContent = contentArr.find(c => c.type === 'text');
                    if (textContent && textContent.text) {
                        setContent(textContent.text);
                    } else {
                        // Try to find resource content (like what QMD returns)
                        const resourceContent = contentArr.find(c => c.type === 'resource');
                        if (resourceContent && resourceContent.resource && resourceContent.resource.text) {
                            setContent(resourceContent.resource.text);
                        } else {
                            // Fallback to stringified content
                            setContent(JSON.stringify(contentArr, null, 2));
                        }
                    }
                } else {
                    setContent('No content returned.');
                }
            } catch (err: any) {
                console.error('Error fetching document:', err);
                setError(err.message || 'Failed to load document');
            } finally {
                setLoading(false);
            }
        }

        if (file) {
            fetchDoc();
        }
    }, [file]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="viewer-overlay">
            <div className="viewer-header">
                <button className="back-btn" onClick={onClose}>
                    <ArrowLeft size={16} />
                    Back
                </button>
                <div className="viewer-title" title={file}>
                    <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--text-secondary)' }} />
                    {file.split('/').pop() || file}
                </div>
                <button className="secondary-btn" onClick={handleCopy} disabled={!content || loading}>
                    {copied ? <Check size={16} color="#34c759" /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>

            <div className="viewer-content">
                {loading ? (
                    <div className="loader-container">
                        <Loader2 className="animate-spin" size={24} />
                        <span style={{ marginLeft: '10px' }}>Loading document...</span>
                    </div>
                ) : error ? (
                    <div className="empty-state" style={{ color: 'red' }}>
                        <p>Error loading document: {error}</p>
                    </div>
                ) : (
                    <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
