import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  Space, 
  Card, 
  Typography, 
  Message, 
  Spin 
} from '@arco-design/web-react'
import { IconUpload } from '@arco-design/web-react/icon'
import axios from 'axios'
import { FormSchema, FormField } from '../types'

const { Title } = Typography
const { Option } = Select

interface DynamicFormProps {
  schemaId?: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

const DEFAULT_DATA: Record<string, any> = {};

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId = 'ad-form', 
  onSubmit,
  initialData = DEFAULT_DATA 
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);

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
              uid: `img-${index}`, name: `图片${index + 1}`, status: 'done', url: url, response: { url }
            })));
          }
          
          if (initialData.videoUrls && Array.isArray(initialData.videoUrls)) {
            const urls = initialData.videoUrls as string[];
            setVideoFileList(urls.map((url, index) => ({
              uid: `vid-${index}`, name: `视频${index + 1}`, status: 'done', url: url, response: { url }
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
    const { file, onSuccess, onError } = option;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = response.data.url;
      onSuccess({ url: fileUrl });
      return { url: fileUrl };
    } catch (error) {
      Message.error('文件上传失败');
      onError(error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const finalValues = {
        ...values,
        imageUrls: imageFileList.filter((f: any) => f.status === 'done').map((f: any) => f.response?.url || f.url),
        videoUrls: videoFileList.filter((f: any) => f.status === 'done').map((f: any) => f.response?.url || f.url),
      };

      if (onSubmit) {
        await onSubmit(finalValues);
      }
      
      form.resetFields();
      setImageFileList([]);
      setVideoFileList([]);
    } catch (error) {
      console.error('提交过程中发生错误');
    } finally {
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
      const tipText = isImage ? '点击上传图片' : '点击上传视频';

      return (
        <Form.Item 
          key={field.name} 
          {...commonProps}
          // 🚀 核心修复：Trigger 设为 fileList，让校验器直接接收最新的 fileList
          trigger="onChange"
          rules={[{ 
            required: field.required, 
            validator: (value) => {
              return new Promise<void>((resolve, reject) => {
                // 这里的 value 就是最新的 fileList (因为 trigger="onChange")
                // 如果 value 为空或者不是数组，回落到 currentFileList
                const list = Array.isArray(value) ? value : currentFileList;

                if (field.required) {
                   if (!list || list.length === 0) {
                      reject(`请至少上传一个${field.label}`);
                      return;
                   }
                   // 只要有一个文件正在上传或错误，就提示等待
                   // 但如果至少有一个是 done 且没有 uploading，通常也可以算通过，这里严格要求全部完成
                   const hasUploading = list.some((f: any) => f.status === 'uploading');
                   const hasError = list.some((f: any) => f.status === 'error');
                   
                   if (hasUploading) {
                      reject(`请等待${field.label}上传完成`);
                      return;
                   }
                   if (hasError) {
                      reject(`${field.label}上传失败，请删除重试`);
                      return;
                   }
                }
                resolve();
              });
            }
          }]}
        >
          <Upload
            multiple={field.multiple}
            limit={10}
            listType={isImage ? "picture-card" : "text"}
            accept={acceptType}
            fileList={currentFileList}
            customRequest={handleUpload}
            disabled={field.disabled}
            onChange={(fileList) => {
              setFileList(fileList);
              // 🚀 关键：直接将 fileList 作为值传给 FormItem，触发校验
              form.setFieldValue(field.name, fileList);
            }}
            onRemove={(file) => {
              const newList = currentFileList.filter(item => item.uid !== file.uid);
              setFileList(newList);
              form.setFieldValue(field.name, newList);
            }}
          >
            {isImage ? (
              <div style={{ textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 20 }}/>
                <div style={{ marginTop: 8, fontSize: 12 }}>上传</div>
              </div>
            ) : (
              <Button icon={<IconUpload />}>{tipText}</Button>
            )}
          </Upload>
        </Form.Item>
      );
    }

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

  if (loading && !schema) return <div style={{textAlign: 'center', padding: 20}}><Spin /></div>;
  if (!schema) return <Card>配置不存在</Card>;

  return (
    <Card bordered={false} bodyStyle={{ padding: 0 }}>
      <Title heading={4} style={{ marginTop: 0, marginBottom: 24 }}>{schema.title}</Title>
      <Form form={form} layout="vertical" onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}
        <Form.Item style={{ marginTop: 20 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">提交</Button>
            <Button size="large" onClick={() => { form.resetFields(); setImageFileList([]); setVideoFileList([]); }}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DynamicForm;