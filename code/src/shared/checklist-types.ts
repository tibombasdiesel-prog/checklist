export type EquipmentCategory = 'vehicle' | 'machinery';

export interface Checklist {
  id: number;
  user_id: number;
  equipment_category: EquipmentCategory;
  vehicle_type: 'light' | 'heavy';
  brand_model: string;
  license_plate: string | null;
  odometer: number | null;
  equipment_identifier: string | null;
  initial_observations: string | null;
  client_signature_key: string | null;
  collaborator_signature_key: string | null;
  is_completed: boolean;
  os_ready: boolean;
  os_opened_at: string | null;
  os_opened_by_user_id: number | null;
  os_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistPhoto {
  id: number;
  checklist_id: number;
  photo_type: 'front' | 'back' | 'left' | 'right' | 'roof';
  r2_key: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistVideo {
  id: number;
  checklist_id: number;
  r2_key: string;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistRequest {
  equipment_category: EquipmentCategory;
  vehicle_type: 'light' | 'heavy';
  brand_model: string;
  license_plate?: string;
  odometer?: number;
  equipment_identifier?: string;
  initial_observations?: string;
}

export interface ChecklistWithPhotos extends Checklist {
  photos: ChecklistPhoto[];
  videos?: ChecklistVideo[];
  user_name?: string;
}
