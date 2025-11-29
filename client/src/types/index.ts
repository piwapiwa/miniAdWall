// 广告数据类型
export interface Ad {
  id: number;
  title: string;
  author: string; 
  description: string;
  imageUrls: string[];
  videoUrls: string[];
  targetUrl: string;
  price: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

// 广告列表状态类型
export interface AdState {
  ads: Ad[];
  loading: boolean;
  error: string | null;
  selectedAd: Ad | null;
  // Actions
  fetchAds: () => Promise<void>;
  fetchAdById: (id: number) => Promise<Ad | null>;
  createAd: (ad: Omit<Ad, 'id' | 'createdAt' | 'updatedAt' | 'clicks'>) => Promise<Ad>;
  updateAd: (id: number, ad: Partial<Ad>) => Promise<Ad>;
  deleteAd: (id: number) => Promise<void>;
  incrementClicks: (id: number) => Promise<void>;
}

// 动态表单字段类型
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'file' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  maxLength?: number;
  minLength?: number;
  multiple?: boolean;
}

// 动态表单模式类型
export interface FormSchema {
  id: string;
  title: string;
  fields: FormField[];
}