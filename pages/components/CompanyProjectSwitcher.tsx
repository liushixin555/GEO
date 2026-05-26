import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Select, Typography, Space, App, Tooltip } from 'antd';
import { SwapOutlined, HomeOutlined, ProjectOutlined } from '@ant-design/icons';
import apiClient from '../lib/apiClient';
import { useAppContext } from '../context/AppContext';

interface SelectionItem {
  id: number;
  short_name: string;
}

interface CompanyProjectSwitcherProps {
  collapsed?: boolean;
}

const CompanyProjectSwitcher: React.FC<CompanyProjectSwitcherProps> = ({ collapsed = false }) => {
  const { companyId, companyName, projectId, projectName, setContext } = useAppContext();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [companies, setCompanies] = useState<SelectionItem[]>([]);
  const [projects, setProjects] = useState<SelectionItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchContext = useCallback(async (targetCompanyId?: number) => {
    try {
      const params: { company_id?: number } = {};
      if (targetCompanyId) params.company_id = targetCompanyId;
      const res = await apiClient.get('/auth/context', {
        params,
      });
      return res.data.data;
    } catch {
      return null;
    }
  }, []);

  const openModal = async () => {
    setSelectedCompanyId(companyId);
    setSelectedProjectId(projectId);
    setLoading(true);
    setModalOpen(true);

    const data = await fetchContext(companyId || undefined);
    if (data) {
      setCompanies(data.companies);
      // If we have a target company, fetch its projects
      if (companyId) {
        const withProjects = await fetchContext(companyId);
        setProjects(withProjects?.projects ?? []);
      } else {
        setProjects([]);
      }
    }
    setLoading(false);
  };

  const handleCompanyChange = async (newCompanyId: number) => {
    setSelectedCompanyId(newCompanyId);
    setSelectedProjectId(null);
    setLoading(true);
    const data = await fetchContext(newCompanyId);
    setProjects(data?.projects ?? []);
    setLoading(false);
  };

  const handleConfirm = async () => {
    const company = companies.find((c) => c.id === selectedCompanyId) ?? null;
    const project = projects.find((p) => p.id === selectedProjectId) ?? null;
    setContext(company, project);

    // Persist selection to server
    if (company) {
      try {
        await apiClient.put('/auth/selection', {
          company_id: company.id,
          project_id: project?.id ?? null,
        });
      } catch {
        // Ignore save errors — localStorage is the source of truth on client
      }
    }

    setModalOpen(false);
    message.success('切换成功');
  };

  return (
    <>
      {collapsed ? (
        <Tooltip title={`切换公司/项目\n${companyName || '未选择公司'} / ${projectName || '未选择项目'}`}>
          <Button
            type="text"
            size="small"
            icon={<SwapOutlined />}
            onClick={openModal}
            aria-label="切换公司/项目"
          />
        </Tooltip>
      ) : (
      <div className="switcher-info">
        <div className="switcher-row">
          <Typography.Text type="secondary" className="sidebar-footer-info">
            <HomeOutlined className="sidebar-icon-margin" />
            {companyName || '未选择公司'}
          </Typography.Text>
          <Button
            type="text"
            size="small"
            icon={<SwapOutlined />}
            onClick={openModal}
            className="switcher-btn"
          />
        </div>
        <div className="switcher-row">
          <Typography.Text type="secondary" className="sidebar-footer-info">
            <ProjectOutlined className="sidebar-icon-margin" />
            {projectName || '未选择项目'}
          </Typography.Text>
        </div>
      </div>
      )}

      <Modal
        title="切换公司/项目"
        open={modalOpen}
        onOk={handleConfirm}
        onCancel={() => setModalOpen(false)}
        okText="确认"
        cancelText="取消"
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>公司</Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={selectedCompanyId ?? undefined}
              onChange={handleCompanyChange}
              loading={loading}
              placeholder="请选择公司"
              options={companies.map((c) => ({ value: c.id, label: c.short_name }))}
            />
          </div>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>项目</Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={selectedProjectId ?? undefined}
              onChange={(v) => setSelectedProjectId(v)}
              loading={loading}
              placeholder="请选择项目"
              allowClear
              options={projects.map((p) => ({ value: p.id, label: p.short_name }))}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default CompanyProjectSwitcher;
