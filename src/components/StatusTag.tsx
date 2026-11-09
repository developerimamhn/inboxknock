import { getCopy, type Lang, type Status } from "@/config/site";

export function StatusTag({ status, lang, large = false }: { status: Status; lang: Lang; large?: boolean }) {
  const name = getCopy(lang).results.items[status].name;
  return (
    <span className={`tag tag-${status} ${large ? "text-[1.125rem]" : ""}`}>
      <span className="tag-dot" aria-hidden="true" />
      {name}
    </span>
  );
}
