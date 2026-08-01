import Link from "next/link";

import {
  bracketStageTypes,
  standingsStageTypes,
} from "@/lib/domain/bracket-standings";

export function StageStructureLinks({
  stages,
  basePath,
  locale,
}: {
  stages: Array<{ id: string; name: string; stage_type: string }>;
  basePath: string;
  locale: "en" | "ru";
}) {
  const bracketLabel = locale === "ru" ? "Сетка" : "Bracket";
  const standingsLabel = locale === "ru" ? "Таблица" : "Standings";
  const applicable = stages.filter(
    (stage) =>
      bracketStageTypes.has(stage.stage_type) ||
      standingsStageTypes.has(stage.stage_type),
  );
  if (!applicable.length) return null;
  return (
    <section className="adminPanel stageStructureNav">
      <h2>{locale === "ru" ? "Структура турнира" : "Tournament structure"}</h2>
      <ul>
        {applicable.map((stage) => (
          <li key={stage.id}>
            <strong>{stage.name}</strong>
            {bracketStageTypes.has(stage.stage_type) ? (
              <Link href={`${basePath}/stages/${stage.id}/bracket`}>
                {bracketLabel}
              </Link>
            ) : null}
            {standingsStageTypes.has(stage.stage_type) ? (
              <Link href={`${basePath}/stages/${stage.id}/standings`}>
                {standingsLabel}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
