import React, { useState, useCallback } from 'react';
import AuditOverview from './components/AuditOverview';
import NewAuditForm from './components/NewAuditForm';
import AuditDetailPage from './components/AuditDetail';

type View =
  | { kind: 'overview' }
  | { kind: 'new' }
  | { kind: 'detail'; jobId: string };

/**
 * 诊断管理入口 — 3 视图切换
 *
 * - overview：任务列表（默认）
 * - new：新建诊断
 * - detail：诊断详情（完整报告 UI）
 */
const AuditPage: React.FC = () => {
  const [view, setView] = useState<View>({ kind: 'overview' });

  const goNew = useCallback(() => setView({ kind: 'new' }), []);
  const goOverview = useCallback(() => setView({ kind: 'overview' }), []);
  const goDetail = useCallback((jobId: string) => setView({ kind: 'detail', jobId }), []);

  if (view.kind === 'new') {
    return <NewAuditForm onBack={goOverview} onCreated={goDetail} />;
  }

  if (view.kind === 'detail') {
    return <AuditDetailPage jobId={view.jobId} onBack={goOverview} onView={goDetail} />;
  }

  return <AuditOverview onNew={goNew} onView={goDetail} />;
};

export default AuditPage;
