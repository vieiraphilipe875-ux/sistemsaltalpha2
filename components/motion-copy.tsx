import { Fragment } from "react";

export function MotionCopy({ text }: { text: string }) {
  const words = text.split(" ");
  return words.map((word, index) => <Fragment key={index}><span className="motion-word-wrap" aria-hidden="true"><span className="motion-word">{Array.from(word).map((letter, position) => <span className="motion-char" key={position}>{letter}</span>)}</span></span>{index < words.length - 1 ? " " : null}</Fragment>);
}
