export default function Hyperlink(props: { href: string; text: string }) {
  return (
    <a
      className="font-mono font-bold text-orange-500 hover:underline"
      href={props.href}
      target="_blank"
      rel="noreferrer"
    >
      {props.text}
    </a>
  );
}
