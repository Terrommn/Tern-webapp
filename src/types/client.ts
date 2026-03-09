export type ClientRecord = {
  id: string;
  name: string;
  max_weight: number | null;
  min_weight: number | null;
  max_length: number | null;
  max_width: number | null;
  max_height: number | null;
  orientation: string | null;
  max_rolls: number | null;
  internal_diameter: number | null;
  external_diameter: number | null;
  created_at: string | null;
  updated_at: string | null;
};
