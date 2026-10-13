'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from './Language';
export default function Modal({ title, children, onClose, wide = false }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    const { lang, t, bi } = useI18n();
    const ref = useRef<HTMLDialogElement>(null), closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => { const d = ref.current; if (!d)
        return; d.showModal(); const cancel = (e: Event) => { e.preventDefault(); closeRef.current(); }; d.addEventListener('cancel', cancel); return () => { d.removeEventListener('cancel', cancel); d.close(); }; }, []);
    return <dialog ref={ref} className={'modal' + (wide ? ' wide' : '')} aria-label={title} onClick={e => { if (e.target === ref.current) {
        const r = ref.current!.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
            onClose();
    } }}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={t("关闭对话框")}><X size={20}/></button></div><div className="modal-content">{children}</div></dialog>;
}
