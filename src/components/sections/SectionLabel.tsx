export function SectionLabel({ num, text, id }: { num: string; text: string; id?: string }) {
  return (
    <p className="label" id={id}>
      <span className="label-num" aria-hidden="true">
        [ {num} ]
      </span>
      <span>{text}</span>
    </p>
  );
}
