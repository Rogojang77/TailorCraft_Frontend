export interface GeneratePreviewRequest {
  orderId: string;
  prompt?: string;
}

export interface GeneratePreviewResponse {
  success: boolean;
  imageUrl: string;
  previewId: string;
  createdAt: string;
}

export interface GeneratePreviewErrorResponse {
  success: false;
  error: 'ORDER_INCOMPLETE' | 'ORDER_NOT_FOUND' | 'GENERATION_FAILED';
  message: string;
  missingFields?: string[];
}

export interface GetPreviewResponse {
  success: boolean;
  preview: {
    id: string;
    imageUrl: string;
    prompt: string | null;
    createdAt: string;
  } | null;
}

export type AIPreviewRequiredField =
  | 'client.gender'
  | 'client.referenceImage';

export interface OrderForAIValidation {
  customer?: {
    gender?: string | null;
    referenceImage?: string | null;
  };
}

export interface AIPreviewValidationResult {
  isComplete: boolean;
  missingFields: AIPreviewRequiredField[];
  completionPercentage: number;
}
