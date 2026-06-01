export type CategoryGroup =
  | "한식"
  | "일식"
  | "중식"
  | "양식"
  | "분식"
  | "카페·디저트"
  | "베이커리"
  | "패스트푸드"
  | "술집"
  | "편의점"
  | "기타";

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  zipcode: string | null;
  gu: string;
  dong: string;
  lat: number;
  lng: number;
  category: string | null;
  categoryGroup: CategoryGroup;
  phone: string | null;
  placeUrl: string | null;
  externalLink?: string | null;
}

export interface UserLocation {
  lat: number;
  lng: number;
}
