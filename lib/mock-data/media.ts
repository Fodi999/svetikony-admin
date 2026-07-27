import type { MediaAsset } from "@/types/entities";
import { placeholderImage } from "./placeholder-image";

const now = new Date().toISOString();

function image(id: string, name: string, label: string): MediaAsset {
  return {
    id,
    url: placeholderImage(id, label),
    name,
    mimeType: "image/svg+xml",
    sizeBytes: 84_000,
    kind: "image",
    alt: label,
    width: 480,
    height: 640,
    createdAt: now,
    updatedAt: now,
  };
}

export const mockMediaAssets: MediaAsset[] = [
  image("media-icon-spasitel", "spasitel-nerukotvorny.jpg", "Спас Нерукотворний"),
  image("media-icon-bogomater", "bogomater-volodymyrska.jpg", "Богоматір Володимирська"),
  image("media-icon-mykolai", "mykolai-chudotvorets.jpg", "Микола Чудотворець"),
  image("media-icon-pokrova", "pokrova-presvyatoi-bohorodytsi.jpg", "Покрова Пресвятої Богородиці"),
  image("media-icon-troitsa", "svyata-troitsa.jpg", "Свята Трійця"),
  image("media-icon-arhystratyh", "arhystratyh-myhail.jpg", "Архістратиг Михаїл"),
  image("media-saint-mykolai", "svt-mykolai.jpg", "Свт. Микола"),
  image("media-saint-olha", "kn-olha.jpg", "Кн. Ольга"),
  image("media-church-exterior", "khram-exterior.jpg", "Храм, зовнішній вигляд"),
  image("media-church-interior", "khram-interior.jpg", "Храм, інтер'єр"),
  image("media-church-logo", "khram-logo.jpg", "Логотип храму"),
  image("media-product-icon-small", "ikona-mala.jpg", "Ікона, малий розмір"),
  image("media-product-icon-large", "ikona-velyka.jpg", "Ікона, великий розмір"),
  image("media-category-icons", "catalog-icons.jpg", "Категорія: ікони"),
  image("media-category-books", "catalog-books.jpg", "Категорія: книги"),
];

export function findMediaAsset(id?: string): MediaAsset | undefined {
  if (!id) return undefined;
  return mockMediaAssets.find((asset) => asset.id === id);
}
