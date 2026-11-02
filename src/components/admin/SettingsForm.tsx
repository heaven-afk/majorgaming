"use client";

import { useActionState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { networkLabels, NETWORKS, settingsCopy as copy, type Settings } from "@/content/settings";
import { Field, invalid, SaveBar, Section, submitWith, useFocusError, useSavedToast, type FormState } from "./Form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const FIGURES = ["squads", "matches", "players"] as const;

/** Links and Home's community numbers: the few site-wide things worth changing without code. */
export default function SettingsForm({ action, values }: { action: Action; values: Settings }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state);
  useFocusError(state);
  const f = state.fields;

  return (
    <form className="ad-form" onSubmit={submitWith(formAction, startTransition)} noValidate>
      <Section title={copy.links.title} lede={copy.links.lede}>
        <Field name="discord" label={copy.links.discord} hint={copy.links.discordHint} error={f?.discord}>
          <input id="f-discord" name="discord" type="url" defaultValue={values.discord} placeholder="https://discord.gg/…" {...invalid(f, "discord")} />
        </Field>
        <div className="ad-grid">
          {NETWORKS.map((n) => (
            <Field key={n} name={`social_${n}`} label={networkLabels[n]} error={f?.[`social_${n}`]}>
              <span className="ad-input-icon">
                <Icon name={n} size={16} />
                <input id={`f-social_${n}`} name={`social_${n}`} type="url" defaultValue={values.socials[n]} placeholder="Not shown" {...invalid(f, `social_${n}`)} />
              </span>
            </Field>
          ))}
        </div>
      </Section>

      <Section title={copy.community.title} lede={copy.community.lede}>
        <div className="ad-grid">
          <Field name="community_1" label={copy.community.first} error={f?.community_1}>
            <input id="f-community_1" name="community_1" defaultValue={values.community[0]} maxLength={40} {...invalid(f, "community_1")} />
          </Field>
          <Field name="community_2" label={copy.community.second} error={f?.community_2}>
            <input id="f-community_2" name="community_2" defaultValue={values.community[1]} maxLength={40} {...invalid(f, "community_2")} />
          </Field>
        </div>
      </Section>

      <Section title={copy.stats.title} lede={copy.stats.lede}>
        <ul className="ad-figures">
          {FIGURES.map((k) => (
            <li key={k}>
              <Field name={`${k}_value`} label={copy.stats[k]} error={f?.[`${k}_value`]}>
                <input id={`f-${k}_value`} name={`${k}_value`} inputMode="numeric" defaultValue={values.stats[k].value} {...invalid(f, `${k}_value`)} />
              </Field>
              <Field name={`${k}_suffix`} label={copy.stats.suffix} hint={copy.stats.suffixHint} error={f?.[`${k}_suffix`]}>
                <input id={`f-${k}_suffix`} name={`${k}_suffix`} defaultValue={values.stats[k].suffix} maxLength={3} {...invalid(f, `${k}_suffix`)} />
              </Field>
            </li>
          ))}
        </ul>
      </Section>

      <SaveBar state={state} toast={toast} pending={pending} label="Save settings" idle={copy.idle} />
    </form>
  );
}
