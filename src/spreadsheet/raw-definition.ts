
export interface RawDefinition {
  include: boolean;
  sizing: string;
  qeImpact: boolean;
  docImpact: boolean;
  neededCRW: boolean;
  mvpCRW: string;
  mvpCHE: string;
  quarter: string;
  team: string;
  customerCase: string;
  status: string;
  atRisk: string;
  kind: string;
  labels: string;
  severity: string;
  theme: string;
  title: string;
  link: string;
  comments: string;
  state: string;
}

export interface TeamRawDefinition {
  assignment: string;
  sprint: string;
  priority: string;
  severity: string;
  title: string;
  kind: string;
  link: string;
  theme: string;
  otherTeam: string;
  comments: string;
  state: string;
}
