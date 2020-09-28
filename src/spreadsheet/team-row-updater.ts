import { TeamRawDefinition } from "./raw-definition";

export class TeamRowUpdater {

  public static ASSIGNMENT = "Assignment";
  public static SPRINT = "Sprint";
  public static PRIORITY = "Priority Order";
  public static SEVERITY = "Severity";
  public static TITLE = "Title";
  public static KIND = "Kind";
  public static LINK = "Link";
  public static COMMENTS = "Comments";
  public static MILESTONE = "Milestone";
  public static OTHER_TEAM = "Other Team";
  public static STATE = "State";
  public static STATUS = "Status";
  public static AREAS = "Areas";
  public static ASSIGNEE = "Assignee";

  private mapping: Map<string, number>;

  constructor(private header: string[]) {
    // mapping
    this.mapping = new Map();
    this.defineMapping(TeamRowUpdater.ASSIGNMENT);
    this.defineMapping(TeamRowUpdater.SPRINT);
    this.defineMapping(TeamRowUpdater.PRIORITY);
    this.defineMapping(TeamRowUpdater.SEVERITY);
    this.defineMapping(TeamRowUpdater.TITLE);
    this.defineMapping(TeamRowUpdater.KIND);
    this.defineMapping(TeamRowUpdater.LINK);
    this.defineMapping(TeamRowUpdater.COMMENTS);
    this.defineMapping(TeamRowUpdater.MILESTONE);
    this.defineMapping(TeamRowUpdater.OTHER_TEAM);
    this.defineMapping(TeamRowUpdater.STATE);
    this.defineMapping(TeamRowUpdater.STATUS);
    this.defineMapping(TeamRowUpdater.AREAS);
    this.defineMapping(TeamRowUpdater.ASSIGNEE);
  }

  public defineMapping(key: string) {
    this.mapping.set(key, this.getColumnIndex(key));
  }

  public getRow(rawDefinition: TeamRawDefinition): string[] {
    //

    const buildRow = new Array<string>(this.header.length);

    if (this.mapping.has(TeamRowUpdater.ASSIGNMENT)) {
      buildRow[this.mapping.get(TeamRowUpdater.ASSIGNMENT)!] = rawDefinition.assignment;
    }

    if (this.mapping.has(TeamRowUpdater.AREAS)) {
      buildRow[this.mapping.get(TeamRowUpdater.AREAS)!] = rawDefinition.areas;
    }
    if (this.mapping.has(TeamRowUpdater.MILESTONE)) {
      buildRow[this.mapping.get(TeamRowUpdater.MILESTONE)!] = `'${rawDefinition.milestone}`;
    }
    if (this.mapping.has(TeamRowUpdater.PRIORITY)) {
      buildRow[this.mapping.get(TeamRowUpdater.PRIORITY)!] = rawDefinition.priority;
    }
    if (this.mapping.has(TeamRowUpdater.SEVERITY)) {
      buildRow[this.mapping.get(TeamRowUpdater.SEVERITY)!] = rawDefinition.severity;
    }
    if (this.mapping.has(TeamRowUpdater.TITLE)) {
      buildRow[this.mapping.get(TeamRowUpdater.TITLE)!] = rawDefinition.title;
    }
    if (this.mapping.has(TeamRowUpdater.KIND)) {
      buildRow[this.mapping.get(TeamRowUpdater.KIND)!] = rawDefinition.kind;
    }
    if (this.mapping.has(TeamRowUpdater.LINK)) {
      buildRow[this.mapping.get(TeamRowUpdater.LINK)!] = rawDefinition.link;
    }
    if (this.mapping.has(TeamRowUpdater.COMMENTS)) {
      buildRow[this.mapping.get(TeamRowUpdater.COMMENTS)!] = rawDefinition.comments;
    }
    if (this.mapping.has(TeamRowUpdater.OTHER_TEAM)) {
      buildRow[this.mapping.get(TeamRowUpdater.OTHER_TEAM)!] = rawDefinition.otherTeam;
    }
    if (this.mapping.has(TeamRowUpdater.STATE)) {
      buildRow[this.mapping.get(TeamRowUpdater.STATE)!] = rawDefinition.state;
    }
    if (this.mapping.has(TeamRowUpdater.STATUS)) {
      buildRow[this.mapping.get(TeamRowUpdater.STATUS)!] = rawDefinition.status;
    }
    if (this.mapping.has(TeamRowUpdater.ASSIGNEE)) {
      buildRow[this.mapping.get(TeamRowUpdater.ASSIGNEE)!] = rawDefinition.assignee;
    }

    return buildRow;

  }

  public getDefinition(row: string[]): TeamRawDefinition {
    return {
      assignment: row[this.mapping.get(TeamRowUpdater.ASSIGNMENT)!],
      areas: row[this.mapping.get(TeamRowUpdater.AREAS)!],
      milestone: row[this.mapping.get(TeamRowUpdater.MILESTONE)!],
      priority: row[this.mapping.get(TeamRowUpdater.PRIORITY)!],
      severity: row[this.mapping.get(TeamRowUpdater.SEVERITY)!],
      title: row[this.mapping.get(TeamRowUpdater.TITLE)!],
      kind: row[this.mapping.get(TeamRowUpdater.KIND)!],
      link: row[this.mapping.get(TeamRowUpdater.LINK)!],
      otherTeam: row[this.mapping.get(TeamRowUpdater.OTHER_TEAM)!],
      comments: row[this.mapping.get(TeamRowUpdater.COMMENTS)!],
      state: row[this.mapping.get(TeamRowUpdater.STATE)!],
      status: row[this.mapping.get(TeamRowUpdater.STATUS)!],
      assignee: row[this.mapping.get(TeamRowUpdater.ASSIGNEE)!],
    };
  }

  public getColumnIndex(key: string): number {
    return this.header.findIndex((data: string) => data.toLowerCase().includes(key.toLowerCase()));
  }

}
