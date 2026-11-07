import { createElement } from "react";
import {
  Atom, BookOpen, Calculator, Code2, Dna, FlaskConical, Globe2, Landmark, Languages,
  Music, Palette, PenLine, Brain, Sigma, Cpu, Bot, type LucideIcon,
} from "lucide-react";

const RULES: Array<[RegExp, LucideIcon]> = [
  [/agent|robot|\bbot\b|llm|prompt/i, Bot],
  [/deep|neural|machine|ml\b|ai\b|learning/i, Brain],
  [/math|calc|algebra|geometry|statistic|probab/i, Sigma],
  [/physic|quantum|mechanic/i, Atom],
  [/chem|lab|science/i, FlaskConical],
  [/bio|genetic|anatomy/i, Dna],
  [/code|program|software|python|javascript|compute|algorithm|data struct/i, Code2],
  [/system|network|hardware|os\b|architecture/i, Cpu],
  [/histor|civic|government|politic|law/i, Landmark],
  [/geo|world|earth/i, Globe2],
  [/spanish|french|german|language|english|lit|poetry|novel|composition/i, Languages],
  [/writ|essay|grammar/i, PenLine],
  [/art|design/i, Palette],
  [/music/i, Music],
  [/econ|finance|account/i, Calculator],
];

export function iconForSubject(subject: string): LucideIcon {
  for (const [re, Icon] of RULES) if (re.test(subject)) return Icon;
  return BookOpen;
}

/** Renders the icon for a subject. Uses createElement so the lookup is not a render-time component. */
export function SubjectIcon({ subject, className, strokeWidth = 2.4 }: { subject: string; className?: string; strokeWidth?: number }) {
  return createElement(iconForSubject(subject), { className, strokeWidth });
}
