import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image, Segmented, Input, Empty, Skeleton, Divider, Popconfirm, Tooltip, App } from 'antd';
import { InboxOutlined, PlusOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import apiClient from '../../lib/apiClient';
import type { KbImage } from '../types';

const MAX_IMAGES = 20;

interface ArticleImageManagerProps {
  imageList: string[];
  imageListChange: (list: string[]) => void;
  editable: boolean;
  kbImages: KbImage[];
  kbLoading: boolean;
}

const ArticleImageManager: React.FC<ArticleImageManagerProps> = ({
  imageList, imageListChange, editable, kbImages, kbLoading,
}) => {
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'kb'>('kb');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const { message } = App.useApp();
  const imageListRef = useRef(imageList);
  imageListRef.current = imageList;

  const addImage = useCallback((url: string) => {
    if (imageListRef.current.length >= MAX_IMAGES) {
      message.warning(`最多添加 ${MAX_IMAGES} 张图片`);
      return;
    }
    imageListChange([...imageListRef.current, url]);
  }, [imageListChange, message]);

  const removeImage = useCallback((index: number) => {
    imageListChange(imageListRef.current.filter((_, i) => i !== index));
  }, [imageListChange]);

  const toggleKbImage = useCallback((imageUrl: string) => {
    const current = imageListRef.current;
    if (current.includes(imageUrl)) {
      imageListChange(current.filter((u) => u !== imageUrl));
    } else {
      if (current.length >= MAX_IMAGES) {
        message.warning(`最多添加 ${MAX_IMAGES} 张图片`);
        return;
      }
      imageListChange([...current, imageUrl]);
    }
  }, [imageListChange, message]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('仅支持上传图片文件');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片大小不能超过 10MB');
      return false;
    }
    if (imageListRef.current.length >= MAX_IMAGES) {
      message.warning(`最多添加 ${MAX_IMAGES} 张图片`);
      return false;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addImage(res.data.data.url);
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  }, [addImage, message]);

  const handleAddUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        message.error('仅支持 http/https 协议的图片 URL');
        return;
      }
    } catch {
      message.error('请输入有效的图片 URL');
      return;
    }
    if (imageListRef.current.includes(url)) {
      message.warning('该URL已存在');
      return;
    }
    addImage(url);
    setUrlInput('');
  }, [urlInput, addImage, message]);

  if (!editable) {
    return imageList.length === 0 ? (
      <Empty description="暂无插图" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <div className="article-img-grid">
        {imageList.map((url, idx) => (
          <div key={url} className="article-img-thumb">
            <Image src={url} alt={`插图 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Segmented
        options={[{ label: '从知识库选择', value: 'kb' }, { label: '上传图片', value: 'upload' }, { label: '输入URL', value: 'url' }]}
        value={imageMode}
        onChange={(val) => setImageMode(val as 'upload' | 'url' | 'kb')}
      />
      {imageMode === 'kb' && (
        <div style={{ marginTop: 8 }}>
          {kbImages.length === 0 ? (
            kbLoading ? (
              <div className="article-img-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton.Image key={i} active style={{ width: 80, height: 80 }} />
                ))}
              </div>
            ) : (
              <Empty description="知识库暂无图片，请先在知识库中添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )
          ) : (
            <div className="article-img-grid">
              {kbImages.map((img) => {
                const selected = imageList.includes(img.image_url);
                return (
                  <div key={img.id}
                    className={`article-img-thumb article-img-selectable${selected ? ' article-img-selectable-selected' : ''}`}
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={`选择图片: ${img.title}`}
                    tabIndex={0}
                    onClick={() => toggleKbImage(img.image_url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleKbImage(img.image_url);
                      }
                    }}
                    title={img.title}
                  >
                    <Image src={img.image_url} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
                    {selected && (
                      <div className="article-img-overlay">
                        <CheckOutlined style={{ color: 'var(--color-on-primary)', fontSize: 20 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {imageMode === 'upload' && (
        <Upload.Dragger accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading} style={{ marginTop: 8 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined className="article-img-upload-icon" /></p>
          <p>{uploading ? '上传中...' : '点击或拖拽上传图片'}</p>
        </Upload.Dragger>
      )}
      {imageMode === 'url' && (
        <Input.Search placeholder="输入图片URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onSearch={handleAddUrl} enterButton={<PlusOutlined />} style={{ marginTop: 8 }} />
      )}
      {imageList.length > 0 && (
        <>
          <Divider className="article-img-divider" />
          <div className="article-img-grid">
            {imageList.map((url, idx) => (
              <div key={url} className="article-img-selected-item">
                <Image src={url} alt={`插图 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview />
                <Tooltip title="删除">
                  <div
                    className="article-img-delete-btn"
                    role="button"
                    aria-label={`删除图片 ${idx + 1}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        (e.target as HTMLElement).click();
                      }
                    }}
                  >
                    <Popconfirm title="确定删除此图片？" onConfirm={() => removeImage(idx)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                      <DeleteOutlined style={{ color: 'var(--color-on-primary)', fontSize: 12 }} />
                    </Popconfirm>
                  </div>
                </Tooltip>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default React.memo(ArticleImageManager);
