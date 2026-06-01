import type { CategoryGroup } from "./types";

export const CATEGORY_GROUPS: CategoryGroup[] = [
  "한식",
  "일식",
  "중식",
  "양식",
  "분식",
  "카페·디저트",
  "베이커리",
  "패스트푸드",
  "술집",
  "편의점",
  "기타",
];

export const CATEGORY_ICONS: Record<CategoryGroup, string> = {
  한식: "🍚",
  일식: "🍣",
  중식: "🥟",
  양식: "🍝",
  분식: "🌭",
  "카페·디저트": "☕",
  베이커리: "🥐",
  패스트푸드: "🍔",
  술집: "🍺",
  편의점: "🏪",
  기타: "🍴",
};

export const CATEGORY_COLORS: Record<CategoryGroup, string> = {
  한식: "#ef4444",
  일식: "#3b82f6",
  중식: "#f59e0b",
  양식: "#8b5cf6",
  분식: "#ec4899",
  "카페·디저트": "#a16207",
  베이커리: "#d97706",
  패스트푸드: "#dc2626",
  술집: "#7c3aed",
  편의점: "#10b981",
  기타: "#6b7280",
};

export function classifyCategory(kakaoCategoryName: string | null, restaurantName: string): CategoryGroup {
  const text = `${kakaoCategoryName ?? ""} ${restaurantName}`.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => text.includes(k.toLowerCase()));

  if (has("편의점", "cu", "gs25", "세븐일레븐", "이마트24", "미니스톱")) return "편의점";
  if (has("베이커리", "제과", "빵", "뚜레쥬르", "파리바게뜨", "파리바게트", "bakery")) return "베이커리";
  if (has("카페", "커피", "디저트", "cafe", "coffee", "스타벅스", "이디야", "투썸", "할리스", "메가커피", "컴포즈", "빽다방", "공차", "아이스크림", "베스킨", "요거트")) return "카페·디저트";
  if (has("패스트푸드", "버거", "맥도날드", "버거킹", "롯데리아", "맘스터치", "kfc", "써브웨이", "subway", "치킨", "bbq", "교촌", "굽네", "처갓집", "bhc")) return "패스트푸드";
  if (has("술집", "호프", "포차", "주점", "이자카야", "bar", "와인")) return "술집";
  if (has("일식", "스시", "초밥", "라멘", "라면", "돈까스", "돈가스", "우동", "소바", "규동", "텐동", "오마카세", "japanese", "sushi", "ramen")) return "일식";
  if (has("중식", "짜장", "짬뽕", "마라", "탕수", "양꼬치", "차이나", "중국", "chinese")) return "중식";
  if (has("양식", "파스타", "피자", "스테이크", "이탈리", "italian", "burger", "샐러드", "salad", "멕시", "mexican", "타코")) return "양식";
  if (has("분식", "떡볶이", "김밥", "튀김", "어묵", "순대", "토스트")) return "분식";
  if (has("한식", "국밥", "곰탕", "설렁탕", "삼계탕", "찌개", "백반", "비빔밥", "냉면", "쌈밥", "구이", "갈비", "삼겹", "한정식", "보쌈", "족발", "korean")) return "한식";
  return "기타";
}
