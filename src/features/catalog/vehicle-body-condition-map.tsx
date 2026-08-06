"use client";

import { useTranslations } from "next-intl";
import styles from "./vehicle-body-condition-map.module.css";

const parts = ["front_bumper", "hood", "roof", "front_left_door", "rear_left_door", "front_right_door", "rear_right_door", "trunk", "rear_bumper"] as const;
const conditions = ["original", "locally_painted", "painted", "changed"] as const;

type Part = (typeof parts)[number];
type Condition = (typeof conditions)[number];
type VehicleConditionMap = Partial<Record<Part, Condition>>;

function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && conditions.includes(value as Condition);
}

function ConditionMarks({ part, condition }: { part: Part; condition: Condition }) {
  if (condition === "original") return null;
  const mark = condition === "locally_painted" ? "LP" : condition === "painted" ? "P" : "D";
  const position = {
    front_bumper: [289, 54], hood: [289, 151], roof: [289, 418],
    front_left_door: [99, 286], rear_left_door: [99, 425],
    front_right_door: [479, 286], rear_right_door: [479, 425],
    trunk: [289, 574], rear_bumper: [289, 645],
  }[part];
  return <text className={styles.conditionMark} x={position[0]} y={position[1]}>{mark}</text>;
}

export function VehicleBodyConditionMap({
  value,
  onChange,
  readOnly = false,
}: {
  value: Record<string, string> | null;
  onChange?: (value: Record<string, string>) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("categoryForms");
  const selected: VehicleConditionMap = {};
  for (const part of parts) {
    const condition = value?.[part];
    if (isCondition(condition) && condition !== "original") selected[part] = condition;
  }
  for (const [legacyPart, doors] of [
    ["left_side", ["front_left_door", "rear_left_door"]],
    ["right_side", ["front_right_door", "rear_right_door"]],
  ] as const) {
    const condition = value?.[legacyPart];
    if (!isCondition(condition) || condition === "original") continue;
    for (const door of doors) selected[door] ??= condition;
  }
  const conditionFor = (part: Part): Condition => selected[part] ?? "original";

  function cycle(part: Part) {
    const current = conditionFor(part);
    const next = conditions[(conditions.indexOf(current) + 1) % conditions.length];
    const updated = { ...selected };
    if (next === "original") delete updated[part];
    else updated[part] = next;
    onChange?.(updated);
  }

  function activateOnKeyDown(event: React.KeyboardEvent<SVGGElement>, part: Part) {
    if (readOnly || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    cycle(part);
  }

  return (
    <fieldset className={styles.map}>
      <legend>{t("vehicleCondition.legend")}</legend>
      <div className={styles.key} aria-label={t("vehicleCondition.legend")}>
        {conditions.map((condition) => (
          <span className={`${styles.keyItem} ${styles[condition]}`} key={condition}>
            {t(`vehicleCondition.conditions.${condition}`)}
          </span>
        ))}
      </div>
      <div className={styles.vehicle}>
        <svg viewBox="0 0 578 701" className={styles.car} aria-label={t("vehicleCondition.legend")} role="img">
          <rect className={styles.backdrop} width="578" height="701" />
          <path className={styles.bumperTab} d="M216 28V17q0-8 8-8h24q8 0 8 8v11zM334 28V17q0-8 8-8h24q8 0 8 8v11zM216 667h40v14q0 8-8 8h-24q-8 0-8-8zM334 667h40v14q0 8-8 8h-24q-8 0-8-8z" />
          <path className={styles.sideBase} d="M51 96l38-8 24 10 31 122q60 67 60 196 0 90-67 179l-26 8-25-10H52l-3-44 20-18v-34q-17-18-17-47V229q17-13 31-32l23-30-5-57-50-14zM527 96l-38-8-24 10-31 122q-60 67-60 196 0 90 67 179l26 8 25-10h34l3-44-20-18v-34q17-18 17-47V229q-17-13-31-32l-23-30 5-57 50-14z" />
          <path className={styles.wheelMount} d="M49 99h55v78H49zM474 99h55v78h-55zM49 492h55v97H49zM474 492h55v97h-55z" />
          <path className={styles.glass} d="M193 230q96-28 192 0l-27 139H228zM228 466h130l23 83q-92 28-186 0z" />
          <path className={styles.engine} d="M228 369h130v97H228z" />
        {parts.map((part) => {
          const condition = conditionFor(part);
          const panel = {
            front_bumper: { d: "M207 31h164q17 0 17 17v18q0 11-11 11H201q-11 0-11-11V48q0-17 17-17z" },
            hood: { d: "M212 96q77-27 155 0 15 5 17 24l10 110q-105-28-202 1l8-111q2-19 12-24z" },
            roof: { d: "M228 369h130v97H228z" },
            front_left_door: { d: "M54 228q33 0 51-34 70 58 88 184l-63-13-76-15z" },
            rear_left_door: { d: "M54 350l76 15 63 13v86l-88 35q-13-35-51-35z" },
            front_right_door: { d: "M524 228q-33 0-51-34-70 58-88 184l63-13 76-15z" },
            rear_right_door: { d: "M524 350l-76 15-63 13v86l88 35q13-35 51-35z" },
            trunk: { d: "M195 549q94 28 186 0l10 42q-100 33-198 0z" },
            rear_bumper: { d: "M201 621h176q11 0 11 11v23q0 11-11 11H201q-11 0-11-11v-23q0-11 11-11z" },
          }[part];
          return readOnly ? (
              <g key={part} aria-label={t("vehicleCondition.partState", { part: t(`vehicleCondition.parts.${part}`), condition: t(`vehicleCondition.conditions.${condition}`) })}>
                <title>{t("vehicleCondition.partState", { part: t(`vehicleCondition.parts.${part}`), condition: t(`vehicleCondition.conditions.${condition}`) })}</title>
                <path className={`${styles.panel} ${styles[condition]}`} d={panel.d} fillRule="evenodd" />
                <ConditionMarks part={part} condition={condition} />
              </g>
            ) : (
              <g
                className={styles.interactive}
                key={part}
                onClick={() => cycle(part)}
                onKeyDown={(event) => activateOnKeyDown(event, part)}
                role="button"
                tabIndex={0}
                aria-label={t("vehicleCondition.partState", {
                  part: t(`vehicleCondition.parts.${part}`),
                  condition: t(`vehicleCondition.conditions.${condition}`),
                })}
              >
                <title>{t("vehicleCondition.partState", { part: t(`vehicleCondition.parts.${part}`), condition: t(`vehicleCondition.conditions.${condition}`) })}</title>
                <path className={`${styles.panel} ${styles[condition]}`} d={panel.d} fillRule="evenodd" />
                <ConditionMarks part={part} condition={condition} />
              </g>
            );
        })}
          <path className={styles.doorCutout} d="M112 220q53 48 73 137l-53-10zM132 378l53 11v60l-53 21zM466 220q-53 48-73 137l53-10zM446 378l-53 11v60l53 21z" />
          <circle className={styles.tyre} cx="58" cy="184" r="42" /><circle className={styles.tyre} cx="520" cy="184" r="42" />
          <circle className={styles.tyre} cx="58" cy="503" r="42" /><circle className={styles.tyre} cx="520" cy="503" r="42" />
          <g className={styles.lights}>
            <path d="M213 44h24q12 0 20 18h-35q-9 0-9-9zM365 44h-24q-12 0-20 18h35q9 0 9-9z" />
            <rect x="212" y="634" width="34" height="18" rx="9" /><rect x="332" y="634" width="34" height="18" rx="9" />
          </g>
        </svg>
      </div>
      <div className={styles.summary} aria-live="polite">
        <strong>{t("vehicleCondition.summary")}</strong>
        {Object.keys(selected).length ? (
          <ul>
            {parts.filter((part) => selected[part]).map((part) => (
              <li key={part}>{t("vehicleCondition.partSummary", { part: t(`vehicleCondition.parts.${part}`), condition: t(`vehicleCondition.conditions.${selected[part] as Condition}`) })}</li>
            ))}
          </ul>
        ) : <p>{t("vehicleCondition.none")}</p>}
      </div>
      {!readOnly ? (
        <button type="button" className={styles.reset} onClick={() => onChange?.({})} disabled={!Object.keys(selected).length}>
          {t("vehicleCondition.reset")}
        </button>
      ) : null}
    </fieldset>
  );
}
