import Image from "next/image";
import { faq } from "@/content/site";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";
import Accordion from "./Accordion";

export default function Faq() {
  return (
    <Scene className="faq" id="faq" aria-labelledby="faq-title">
      <div className="faq__aside">
        <div data-rise>
          <span className="label">
            <i />
            {faq.label}
          </span>
          <h2 className="sec-title" id="faq-title">
            {faq.title.before} <em>{faq.title.accent}</em>
          </h2>
          <p className="sec-lede">{faq.lede}</p>
        </div>

        <div className="tile faq__ask" data-rise={1}>
          <ul className="faq__faces" aria-hidden>
            {faq.ask.faces.map((a) => (
              <li key={a.src}>
                <Image src={a.src} alt="" width={64} height={64} />
              </li>
            ))}
          </ul>
          <strong>{faq.ask.title}</strong>
          <p>{faq.ask.body}</p>
          <a className="btn-light" href={faq.ask.href} target="_blank" rel="noreferrer">
            <Icon name="discord" size={18} className="btn-light__icon" />
            {faq.ask.label}
          </a>
        </div>
      </div>

      <Accordion items={faq.items} />
    </Scene>
  );
}
