import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  Card, 
  // Typography, 
  Message, 
  Spin,
  Image,
  Modal
} from '@arco-design/web-react'
import { IconPlus, IconPlayCircle, IconDelete, IconEye } from '@arco-design/web-react/icon'
import axios from 'axios'
import { FormSchema, FormField } from '../types'

// const { Title } = Typography
const { Option } = Select

interface DynamicFormProps {
  schemaId?: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  onCancel?: () => void;
  okText?: string;
}

const DEFAULT_DATA: Record<string, any> = {};

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId = 'ad-form', 
  onSubmit,
  initialData = DEFAULT_DATA,
  onCancel,
  okText = '提交'
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);

  // 预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [previewVideoSrc, setPreviewVideoSrc] = useState('');

  useEffect(() => {
    const fetchFormSchema = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/form-schema/${schemaId}`);
        setSchema(response.data);
        
        if (initialData) {
          form.setFieldsValue(initialData);
          
          if (initialData.imageUrls && Array.isArray(initialData.imageUrls)) {
            const urls = initialData.imageUrls as string[];
            setImageFileList(urls.map((url, index) => ({
              uid: `img-${index}`, name: `图片${index + 1}`, status: 'done', url: url
            })));
          }
          
          if (initialData.videoUrls && Array.isArray(initialData.videoUrls)) {
            const urls = initialData.videoUrls as string[];
            setVideoFileList(urls.map((url, index) => ({
              uid: `vid-${index}`, name: `视频${index + 1}`, status: 'done', url: url
            })));
          }
        }
      } catch (error) {
        console.error('获取表单配置失败:', error);
        Message.error('加载表单配置失败');
      } finally {
        setLoading(false);
      }
    };

    fetchFormSchema();
  }, [schemaId, form, initialData]);

  const handleUpload = async (option: any) => {
    const { file, onSuccess, onError, onProgress } = option;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      });

      const fileUrl = response.data.url;
      onSuccess({ url: fileUrl });
      return { url: fileUrl };
    } catch (error) {
      Message.error('文件上传失败');
      onError(error);
    }
  };

  // 统一预览处理逻辑
  const handlePreview = (file: any) => {
    // 获取文件地址：优先用服务端返回的 url，如果是本地刚选的则生成 blob url
    const url = file.url || (file.originFile && URL.createObjectURL(file.originFile));
    
    if (!url) return;

    // 判断是否为视频
    // 1. 根据文件名后缀 2. 根据文件类型 3. 检查是否在视频列表中
    const isVideo = 
      file.name?.match(/\.(mp4|webm|ogg|mov)$/i) || 
      file.type?.includes('video') || 
      videoFileList.find(v => v.uid === file.uid);

    if (isVideo) {
      setPreviewVideoSrc(url);
      setVideoModalVisible(true);
    } else {
      setPreviewImageSrc(url);
      setPreviewVisible(true);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 构造最终数据
      const finalValues = {
        ...values,
        imageUrls: imageFileList
            .filter((f: any) => f.status === 'done' || f.url) // 确保只提交成功的
            .map((f: any) => f.response?.url || f.url),
        videoUrls: videoFileList
            .filter((f: any) => f.status === 'done' || f.url)
            .map((f: any) => f.response?.url || f.url),
      };

      if (onSubmit) {
        // 等待父组件处理完成
        await onSubmit(finalValues);
      }
      
      // 提交成功后清空表单
      form.resetFields();
      setImageFileList([]);
      setVideoFileList([]);
      
    } catch (error) {
      console.error('提交过程中发生错误:', error);
      Message.error('提交失败，请重试');
    } finally {
      // 🟢 无论成功还是失败，强制关闭 Loading 状态
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      field: field.name,
      label: field.label,
      disabled: field.disabled,
    };

    if (field.type === 'file') {
      const isImage = field.name.toLowerCase().includes('image');
      const currentFileList = isImage ? imageFileList : videoFileList;
      const setFileList = isImage ? setImageFileList : setVideoFileList;
      const acceptType = isImage ? 'image/*' : 'video/*';
      
      return (
        <Form.Item 
          key={field.name} 
          {...commonProps}
          trigger="onChange" // 确保文件变化时立即触发校验
          rules={[
            { 
              // 🔴 重点修复：这里不要写 required: field.required
              // 完全由 validator 内部逻辑控制，防止规则冲突导致移动端卡死
              validator: (value) => {
                return new Promise<void>((resolve, reject) => {
                  // value 可能是 undefined，所以要回退到 currentFileList
                  const list = Array.isArray(value) ? value : currentFileList;
                  
                  if (field.required) {
                     if (!list || list.length === 0) {
                       reject(`请至少上传一个${field.label}`);
                       return;
                     }
                     
                     const hasUploading = list.some((f: any) => f.status === 'uploading');
                     if (hasUploading) {
                       reject(`请等待${field.label}上传完成`);
                       return;
                     }

                     const hasError = list.some((f: any) => f.status === 'error');
                     if (hasError) {
                       reject(`${field.label}上传失败，请删除重试`);
                       return;
                     }
                  }
                  
                  // 所有检查通过
                  resolve();
                });
              }
            }
          ]}
        >
          <Upload
            multiple={field.multiple}
            limit={10}
            listType="picture-card"
            accept={acceptType}
            fileList={currentFileList}
            customRequest={handleUpload}
            disabled={field.disabled}
            //上传前检查文件大小
            beforeUpload={(file) => {
              const isLt500M = file.size < 500 * 1024 * 1024; // 限制为 500MB
              if (!isLt500M) {
                Message.error(`文件 ${file.name} 超过 500MB，无法上传`);
                // 返回 false 阻止上传
                return false;
              }
              return true;
            }}
            onChange={(fileList) => {
              setFileList(fileList);
              // 🟢 关键：手动更新表单值并触发校验
              form.setFieldValue(field.name, fileList);
              // 加一个延时校验，确保状态已同步（解决移动端有时候反应慢的问题）
              setTimeout(() => {
                  form.validate([field.name]).catch(() => {}); 
              }, 0);
            }}
            onPreview={handlePreview}
            onRemove={(file) => {
              const newList = currentFileList.filter(item => item.uid !== file.uid);
              setFileList(newList);
              form.setFieldValue(field.name, newList);
              // 删除时也触发校验
              setTimeout(() => {
                  form.validate([field.name]).catch(() => {});
              }, 0);
            }}
            renderUploadItem={(itemNode, file) => {
              const fileUrl = file.url || (file.response as any)?.url || (file.originFile && URL.createObjectURL(file.originFile));

              if (file.status === 'uploading' || file.status === 'error') {
                return itemNode;
              }
              const isVideo = !isImage;

              return (
                <div className="arco-upload-list-item arco-upload-list-item-done">
                  <div className="arco-upload-list-item-picture custom-media-card">
                    {isVideo ? (
                      <>
                        <video
                          className="custom-media-content"
                          src={`${fileUrl}#t=0.5`}
                          preload="metadata"
                          muted
                        />
                        <div className="play-icon-overlay"><IconPlayCircle /></div>
                      </>
                    ) : (
                      <img className="custom-media-content" src={fileUrl} alt="preview" />
                    )}
                    <div className="custom-mask">
                      <IconEye className="action-icon" onClick={() => handlePreview(file)} />
                      <IconDelete 
                        className="action-icon" 
                        onClick={() => {
                          const newList = currentFileList.filter(item => item.uid !== file.uid);
                          setFileList(newList);
                          form.setFieldValue(field.name, newList);
                          // 触发校验
                          form.validate([field.name]).catch(() => {});
                        }} 
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4E5969', height: '100%' }}>
              <IconPlus style={{ fontSize: 24, color: '#86909c', marginBottom: 4 }} />
            </div>
          </Upload>
        </Form.Item>
      );
    }

    // 其他类型的字段保持默认校验规则
    const defaultRules = [{ 
        required: field.required, 
        message: `${field.label}是必填项`,
        type: field.type === 'number' ? 'number' : 'string'
    }];

    switch (field.type) {
      case 'text':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Input placeholder={field.placeholder} maxLength={field.maxLength} disabled={field.disabled} />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Input type="number" placeholder={field.placeholder} disabled={field.disabled} />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Input.TextArea rows={4} placeholder={field.placeholder} maxLength={field.maxLength} disabled={field.disabled} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Select placeholder={field.placeholder} disabled={field.disabled}>
              {field.options?.map((option) => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return null;
    }
  };

  // 修复 loading 变量报错：现在 loading 是组件内的 state，不会报错了
  if (loading && !schema) return <div style={{textAlign: 'center', padding: 20}}><Spin /></div>;
  if (!schema) return <Card>配置不存在</Card>;

  return (
    <div style={{ padding: '0 12px' }}>
      {/* <Title heading={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>{schema.title}</Title> */}
      <Form form={form} layout="vertical" onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}
        
        <div style={{ 
          marginTop: 32, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #f2f3f5',
          paddingTop: 24
        }}>
          <Button onClick={onCancel} style={{ padding: '0 24px' }}>取消</Button>
          <Button onClick={() => { form.resetFields(); setImageFileList([]); setVideoFileList([]); }} style={{ padding: '0 24px' }}>
            重置
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ padding: '0 32px' }}>
            {okText}
          </Button>
        </div>
      </Form>

      {/* 图片预览组件 */}
      <Image.Preview
        visible={previewVisible}
        src={previewImageSrc}
        onVisibleChange={setPreviewVisible}
      />

      {/* 视频预览弹窗 - 修复 bodyStyle 报错，使用 style 控制 */}
      <Modal
        title={null} // 朋友圈看视频通常没有标题栏
        visible={videoModalVisible}
        footer={null}
        closable={false} // 点击遮罩关闭即可，更沉浸
        onCancel={() => setVideoModalVisible(false)}
        style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'transparent' 
        }}>
          <video 
            src={previewVideoSrc} 
            controls 
            autoPlay 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh', 
              borderRadius: 8, 
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              outline: 'none'
            }} 
          />
        </div>
      </Modal>
    </div>
  );
};

export default DynamicForm;