import React from 'react';
import { Modal, Input, Table, Tag } from 'antd';
import type { Platform } from '../types';

interface PlatformSelectModalProps {
  open: boolean;
  platformList: Platform[];
  platformTotal: number;
  platformPage: number;
  platformSearch: string;
  platformLoading: boolean;
  selectedPlatformKeys: string[];
  platformSortBy: string;
  platformSortOrder: 'asc' | 'desc';
  onSearch: (val: string) => void;
  onSearchChange: (val: string) => void;
  onSelectChange: (keys: string[]) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onFetch: (page: number, search: string, sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const PlatformSelectModal: React.FC<PlatformSelectModalProps> = ({
  open, platformList, platformTotal, platformPage, platformSearch,
  platformLoading, selectedPlatformKeys, platformSortBy, platformSortOrder,
  onSearch, onSearchChange, onSelectChange, onSortChange, onFetch,
  onConfirm, onCancel,
}) => (
  <Modal
    title="选择发布平台"
    open={open}
    onOk={onConfirm}
    onCancel={onCancel}
    width={700}
    okText="确认选择"
    cancelText="取消"
  >
    <div style={{ marginBottom: 12 }}>
      <Input.Search
        placeholder="搜索平台名称或分类"
        value={platformSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onSearch={(val) => onFetch(1, val, platformSortBy, platformSortOrder)}
        allowClear
        style={{ width: '100%' }}
      />
    </div>
    <Table
      rowKey="name"
      dataSource={platformList}
      loading={platformLoading}
      rowSelection={{
        selectedRowKeys: selectedPlatformKeys,
        onChange: (keys) => onSelectChange(keys as string[]),
      }}
      columns={[
        { title: '平台名称', dataIndex: 'name', width: 200, sorter: true, sortOrder: platformSortBy === 'name' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : undefined },
        { title: '分类', dataIndex: 'taxonomy', width: 120, sorter: true, sortOrder: platformSortBy === 'taxonomy' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : undefined },
        { title: '价格', dataIndex: 'price', width: 80, sorter: true, sortOrder: platformSortBy === 'price' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : undefined, render: (v: number) => v != null ? `¥${v}` : '-' },
        { title: '收录率', dataIndex: 'include_rate', width: 80, sorter: true, sortOrder: platformSortBy === 'include_rate' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : undefined, render: (v: number) => v != null ? `${v}%` : '-' },
        { title: '发布率', dataIndex: 'publish_rate', width: 80, sorter: true, sortOrder: platformSortBy === 'publish_rate' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : undefined, render: (v: number) => v != null ? `${v}%` : '-' },
      ]}
      onChange={(_pagination, _filters, sorter) => {
        const s = (Array.isArray(sorter) ? sorter[0] : sorter) as { field?: string; order?: string | null };
        const sortBy = s.order ? (s.field || '') : '';
        const sortOrder = s.order === 'descend' ? 'desc' : 'asc';
        onSortChange(sortBy, sortOrder);
        onFetch(1, platformSearch, sortBy, sortOrder);
      }}
      pagination={{
        current: platformPage,
        pageSize: 10,
        total: platformTotal,
        showSizeChanger: false,
        showTotal: (total) => `共 ${total} 个平台`,
      }}
      size="small"
      scroll={{ y: 400 }}
    />
    <div style={{ marginTop: 8, color: 'var(--color-ink-subtle)' }}>
      已选择 {selectedPlatformKeys.length} 个平台
    </div>
  </Modal>
);

export default React.memo(PlatformSelectModal);
