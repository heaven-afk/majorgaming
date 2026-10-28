"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { howItWorks } from "@/content/site";
import { Mark } from "../brand/Mark";
import { Icon } from "../Icons";
import { useStages } from "../motion/useStages";

/** Idle, manager starts typing, the registration posts, the bot types, confirms, the thread locks. */
const HOLDS = [900, 1200, 1700, 1000, 1500, 2800];
const d = howItWorks.demo.register;
const FIRST_LINE = `${d.fields[0].label}: ${d.fields[0].value}`;

function Msg({ on, avatar, author, bot, children }: { on: boolean; avatar: React.ReactNode; author: string; bot?: boolean; children: React.ReactNode }) {
  return (
    <div className="msg" data-on={on ? "" : undefined}>
      <div className="msg__inner">
        <span className="msg__avatar">{avatar}</span>
        <div className="msg__body">
          <span className="msg__author">
            {author}
            {bot && <span className="msg__tag">BOT</span>}
          </span>
          {children}
        </div>
      </div>
    </div>
  );
}

const botAvatar = (
  <span className="msg__bot">
    <Mark size={17} tone="#f4f2ee" />
  </span>
);

/** Step 1 illustration: a manager posts their squad in the Tier 1 registration thread. */
export default function StepRegister() {
  const { ref, stage } = useStages<HTMLDivElement>(HOLDS, 5);
  const [typed, setTyped] = useState(0);
  const locked = stage === 5;

  useEffect(() => {
    if (stage !== 1) return;
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      setTyped(n);
      if (n >= FIRST_LINE.length) clearInterval(id);
    }, 950 / FIRST_LINE.length);
    return () => {
      clearInterval(id);
      setTyped(0);
    };
  }, [stage]);

  const draft = stage === 1 ? FIRST_LINE.slice(0, typed) : "";

  return (
    <div className="chat" ref={ref} aria-hidden>
      <div className="chat__bar">
        <Icon name="hash" size={15} />
        <span className="chat__crumb">{d.category}</span>
        <Icon name="chevron" size={13} />
        <span>{d.channel}</span>
        <span className="chat__open" data-locked={locked ? "" : undefined}>
          <i />
          {locked ? "Locked" : "Open"}
        </span>
      </div>

      <div className="chat__log">
        <Msg on avatar={botAvatar} author="MGL" bot>
          <p>{d.announce}</p>
        </Msg>
        <Msg on={stage >= 2} avatar={<Image src={d.avatar.src} alt="" width={64} height={64} />} author={d.author}>
          <dl className="reg">
            {d.fields.map((f, i) => (
              <div key={f.label} style={{ "--i": i } as React.CSSProperties}>
                <dt>{f.label}:</dt>
                <dd className={"mention" in f ? "chat__mention" : undefined}>{f.value}</dd>
              </div>
            ))}
          </dl>
          <ul className="reg__players">
            {d.players.map((p, i) => (
              <li key={p.slot} style={{ "--i": d.fields.length + i } as React.CSSProperties}>
                <b>{p.slot}</b>
                <span>{p.ign}</span>
                <small>{p.country}</small>
              </li>
            ))}
          </ul>
        </Msg>
        <Msg on={stage === 3} avatar={botAvatar} author="MGL" bot>
          <span className="chat__dots">
            <i />
            <i />
            <i />
          </span>
        </Msg>
        <Msg on={stage >= 4} avatar={botAvatar} author="MGL" bot>
          <div className="embed">
            <span className="embed__title">
              <span className="embed__check">
                <Icon name="check" size={11} />
              </span>
              {d.embed.title}
            </span>
            <span className="embed__detail">{d.embed.detail}</span>
            <span className="embed__status">
              <i />
              {d.embed.status}
            </span>
          </div>
        </Msg>
        <div className="msg" data-on={locked ? "" : undefined}>
          <div className="msg__inner chat__system">
            <Icon name="lock" size={14} />
            {d.locked}
          </div>
        </div>
      </div>

      <div className="chat__composer" data-typing={draft ? "" : undefined} data-locked={locked ? "" : undefined}>
        {locked ? (
          <span className="chat__placeholder">{d.readOnly}</span>
        ) : (
          <>
            <span className="chat__plus">
              <Icon name="plus" size={14} />
            </span>
            <span className="chat__draft">
              {draft || <span className="chat__placeholder">Message #{d.channel}</span>}
              <i className="chat__caret" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
