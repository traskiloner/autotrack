export interface Part {
  id: number;
  part_name: string;
  brand: string;
  part_number: string;
  quantity: number;
  price: number;
}

export interface Maintenance {
  id: number;
  description: string;
  mileage: number;
  cost: number;
  date: string;
  parts: Part[];
  category?: string;
  document_path?: string;
  checklist?: string[] | string;
}

export interface CarData {
  id: number;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  mileage: number;
  engine_code?: string | null;
  vin?: string | null;
  tire_size?: string | null;
  oil_type?: string | null;
}

export interface Alert {
  id: number;
  description: string;
  target_date: string | null;
  target_mileage: number | null;
  is_completed: boolean;
}

export interface InventoryPart {
  id: number;
  name: string;
  brand: string | null;
  part_number: string | null;
  price: number;
  stock: number;
}

export interface AlertData {
  id: number;
  car_id: number;
  description: string;
  target_date: string | null;
  target_mileage: number | null;
  is_completed: boolean;
  brand: string;
  model: string;
  license_plate: string;
  current_mileage: number;
}

export interface MaintenanceData {
  id: number;
  car_id: number;
  description: string;
  mileage: number;
  cost: number;
  date: string;
  category: string;
  brand: string;
  model: string;
  license_plate: string;
}

export interface FuelLog {
  id: number;
  car_id: number;
  date: string;
  mileage: number;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  is_full_tank: boolean;
  created_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
}


