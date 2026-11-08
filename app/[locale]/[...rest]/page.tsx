import { notFound } from "next/navigation";

// Любой неизвестный адрес внутри /ru или /en показывает локализованную 404.
export default function CatchAllPage() {
  notFound();
}
